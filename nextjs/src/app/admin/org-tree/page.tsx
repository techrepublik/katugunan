"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { 
  Loader2, Plus, Trash, Edit, ChevronRight, ChevronDown, Folder, ShieldAlert, User, 
  Check, X, Search 
} from "lucide-react";

interface OrgNode {
  id: number;
  name: string;
  short_name?: string;
  node_type: string;
  parent_id?: number;
  assigned_user_id?: number;
  children?: OrgNode[];
}

export default function OrgTreePage() {
  const [tree, setTree] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [deleteConfirmNode, setDeleteConfirmNode] = useState<OrgNode | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  // Inline CRUD States
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineAddingParentId, setInlineAddingParentId] = useState<number | null>(null); // -1 for root

  // Inline Form fields
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [nodeType, setNodeType] = useState<string>("BRANCH");
  const [customNodeType, setCustomNodeType] = useState("");
  const [isCustomType, setIsCustomType] = useState(false);
  const [assignedUserId, setAssignedUserId] = useState<number | null>(null);

  // Searchable Dropdown state (inside inline form)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  // Search state for filtering the tree
  const [searchTerm, setSearchTerm] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearchTerm(value), 200);
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchTree = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/org-nodes/tree`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTree(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  useEffect(() => {
    fetchTree();
    fetchUsers();
  }, []);

  const filterTree = (nodes: OrgNode[], query: string): OrgNode[] => {
    return nodes
      .map((node) => ({
        ...node,
        children: node.children ? filterTree(node.children, query) : [],
      }))
      .filter((node) => {
        const matchName = node.name.toLowerCase().includes(query.toLowerCase());
        const matchShort = node.short_name && node.short_name.toLowerCase().includes(query.toLowerCase());
        const matchType = node.node_type.toLowerCase().includes(query.toLowerCase());
        // Assigned personnel name matching
        let matchPersonnel = false;
        if (node.assigned_user_id) {
          const assigned = users.find(u => u.id === node.assigned_user_id);
          if (assigned) {
            const fullName = `${assigned.first_name || ""} ${assigned.last_name || ""}`.trim().toLowerCase();
            const username = (assigned.username || "").toLowerCase();
            const q = query.toLowerCase();
            matchPersonnel = fullName.includes(q) || username.includes(q);
          }
        }
        const match = matchName || matchShort || matchType || matchPersonnel;
        return match || node.children.length > 0;
      });
  }

  // Compute displayed tree based on search
  const displayedTree = useMemo(() => {
    if (!searchTerm) return tree;
    return filterTree(tree, searchTerm);
  }, [tree, searchTerm]);

  // Auto-expand all nodes when a search term is present so matches are fully visible
  useEffect(() => {
    if (!searchTerm) return;
    const ids = new Set<number>();
    const collect = (nodes: OrgNode[]) => {
      nodes.forEach((node) => {
        ids.add(node.id);
        if (node.children && node.children.length > 0) {
          collect(node.children);
        }
      });
    };
    collect(displayedTree);
    setExpanded(() => {
      const newState: Record<number, boolean> = {};
      ids.forEach((id) => {
        newState[id] = true;
      });
      return newState;
    });
  }, [searchTerm, displayedTree]);

  const toggleExpand = (id: number) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNodeTypeChange = (val: string) => {
    if (val === "CUSTOM") {
      setIsCustomType(true);
      setNodeType("CUSTOM");
    } else {
      setIsCustomType(false);
      setNodeType(val);
    }
  };

  const resetForm = () => {
    setName("");
    setShortName("");
    setNodeType("BRANCH");
    setCustomNodeType("");
    setIsCustomType(false);
    setAssignedUserId(null);
    setIsUserDropdownOpen(false);
    setUserSearchTerm("");
  };

  const handleSaveInline = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const isEditing = inlineEditingId !== null;
      
      const url = isEditing
        ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/org-nodes/${inlineEditingId}`
        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/org-nodes`;
      
      const method = isEditing ? "PUT" : "POST";
      
      // If adding child node, the parent_id is inlineAddingParentId.
      // If adding root node, the parent_id is null (since inlineAddingParentId is -1).
      const finalParentId = isEditing 
        ? undefined  // leave it unchanged or pass if required
        : (inlineAddingParentId === -1 ? null : inlineAddingParentId);

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          short_name: shortName || null,
          node_type: isCustomType ? customNodeType : nodeType,
          parent_id: finalParentId,
          assigned_user_id: assignedUserId || null
        })
      });

      if (res.ok) {
        showToast(isEditing ? "Node updated successfully!" : "Node created successfully!");
        setInlineEditingId(null);
        setInlineAddingParentId(null);
        resetForm();
        fetchTree();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.detail || "Failed to save node.", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDeleteNode = async () => {
    if (!deleteConfirmNode) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/org-nodes/${deleteConfirmNode.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Node deleted successfully!");
        setDeleteConfirmNode(null);
        fetchTree();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.detail || "Failed to delete node.", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getNodeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case "BRANCH": return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "UNIT": return "bg-blue-50 text-blue-800 border-blue-200";
      case "DEPARTMENT": return "bg-purple-50 text-purple-800 border-purple-200";
      case "POSITION": return "bg-amber-50 text-amber-800 border-amber-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getAssignedUserName = (assignedId?: number) => {
    if (!assignedId) return null;
    const found = users.find(u => u.id === assignedId);
    return found ? `${found.first_name || ""} ${found.last_name || ""} (${found.username})` : "Unknown User";
  };

  // Filtered users for dropdown search
  const selectedUser = users.find(u => u.id === assignedUserId);
  const filteredUsers = users.filter(u => {
    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
    const username = (u.username || "").toLowerCase();
    const query = userSearchTerm.toLowerCase();
    return fullName.includes(query) || username.includes(query);
  });

  // Inline Form component rendered inside tree row
  const renderInlineForm = (level: number, onCancel: () => void) => {
    return (
      <form 
        onSubmit={handleSaveInline}
        className="flex flex-wrap items-center gap-2 py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl my-1 shadow-inner relative z-10 select-none animate-in fade-in zoom-in-95 duration-150"
        style={{ marginLeft: `${level * 24 + 8}px` }}
      >
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs focus:outline-none focus:border-emerald-500 bg-white"
            placeholder="Node Name (e.g. CCIS or Chairperson)"
          />
        </div>

        <div className="w-[120px]">
          <input
            type="text"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs focus:outline-none focus:border-emerald-500 bg-white"
            placeholder="Alias/Short Name"
          />
        </div>

        <div className="w-[110px]">
          <select
            value={isCustomType ? "CUSTOM" : nodeType}
            onChange={(e) => handleNodeTypeChange(e.target.value)}
            className="w-full px-2 py-1.5 border border-slate-250 rounded-lg text-xs focus:outline-none bg-white font-medium text-slate-700"
          >
            <option value="BRANCH">BRANCH</option>
            <option value="UNIT">UNIT</option>
            <option value="DEPARTMENT">DEPARTMENT</option>
            <option value="POSITION">POSITION</option>
            <option value="CUSTOM">Custom...</option>
          </select>
        </div>

        {isCustomType && (
          <div className="w-[110px]">
            <input
              type="text"
              required
              value={customNodeType}
              onChange={(e) => setCustomNodeType(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs focus:outline-none focus:border-emerald-500 bg-white"
              placeholder="e.g. OFFICE"
            />
          </div>
        )}

        {/* Searchable dropdown wrapper inline */}
        <div className="relative w-[200px]">
          {isUserDropdownOpen && (
            <div className="fixed inset-0 z-10" onClick={() => setIsUserDropdownOpen(false)} />
          )}
          <button
            type="button"
            onClick={() => {
              setIsUserDropdownOpen(!isUserDropdownOpen);
              setUserSearchTerm("");
            }}
            className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs text-left bg-white text-slate-700 font-medium flex justify-between items-center focus:outline-none relative z-20"
          >
            <span className="truncate pr-2">
              {selectedUser 
                ? `${selectedUser.first_name || ""} ${selectedUser.last_name || ""}`
                : "Assign Personnel..."}
            </span>
            <span className="text-[9px] text-slate-400">▼</span>
          </button>

          {isUserDropdownOpen && (
            <div className="absolute z-30 w-64 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
              <input
                type="text"
                autoFocus
                placeholder="Search name..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] focus:outline-none focus:border-emerald-500"
              />
              <div className="max-h-36 overflow-y-auto space-y-0.5 divide-y divide-slate-50 text-[11px]">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setAssignedUserId(u.id);
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-md transition-colors flex justify-between items-center"
                    >
                      <span className="truncate">{u.first_name} {u.last_name}</span>
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1 rounded">@{u.username}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-2 text-center text-slate-400">No personnel found</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-1 shrink-0 ml-auto">
          <button
            type="submit"
            className="p-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-all"
            title="Save"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-500 rounded-lg transition-all"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>
      </form>
    );
  };

  const renderNode = (node: OrgNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded[node.id];
    const isEditing = inlineEditingId === node.id;
    const isAdding = inlineAddingParentId === node.id;

    if (isEditing) {
      return renderInlineForm(level, () => {
        setInlineEditingId(null);
        resetForm();
      });
    }

    return (
      <div key={node.id} className="select-none">
        <div 
          className="flex items-center gap-3 p-3 hover:bg-slate-50/75 border-b border-slate-100 group transition-all"
          style={{ paddingLeft: `${level * 24 + 8}px` }}
        >
          {hasChildren ? (
            <button onClick={() => toggleExpand(node.id)} className="text-slate-500 hover:text-emerald-700 shrink-0">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-4 shrink-0"></span>
          )}

          <Folder size={16} className="text-emerald-700 shrink-0" />
          
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="font-semibold text-slate-800 text-sm truncate">
              {node.name}
            </span>
            {node.short_name && (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                {node.short_name}
              </span>
            )}
            
            <span className={`text-[10px] font-bold uppercase border px-2 py-0.5 rounded ${getNodeColor(node.node_type)}`}>
              {node.node_type}
            </span>

            {node.assigned_user_id && (
              <span className="text-[10px] text-slate-600 bg-slate-100 border border-slate-250 px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1">
                <User size={10} className="text-slate-500" />
                {getAssignedUserName(node.assigned_user_id)}
              </span>
            )}
          </div>

          <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
            <button 
              onClick={() => {
                setInlineAddingParentId(node.id);
                setInlineEditingId(null);
                setNodeType("UNIT"); // default preset child type
                if (!isExpanded) toggleExpand(node.id);
              }}
              className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
              title="Add Child Node"
            >
              <Plus size={14} />
            </button>
            <button 
              onClick={() => {
                setInlineEditingId(node.id);
                setInlineAddingParentId(null);
                setName(node.name);
                setShortName(node.short_name || "");
                const presets = ["BRANCH", "UNIT", "DEPARTMENT", "POSITION"];
                if (presets.includes(node.node_type.toUpperCase())) {
                  setNodeType(node.node_type.toUpperCase());
                  setIsCustomType(false);
                  setCustomNodeType("");
                } else {
                  setNodeType("CUSTOM");
                  setIsCustomType(true);
                  setCustomNodeType(node.node_type);
                }
                setAssignedUserId(node.assigned_user_id || null);
              }}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              title="Edit Node"
            >
              <Edit size={14} />
            </button>
            <button 
              onClick={() => setDeleteConfirmNode(node)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              title="Delete Node"
            >
              <Trash size={14} />
            </button>
          </div>
        </div>

        {/* Render inline create form directly nested under the parent */}
        {isAdding && renderInlineForm(level + 1, () => {
          setInlineAddingParentId(null);
          resetForm();
        })}

        {hasChildren && isExpanded && (
          <div className="transition-all duration-300">
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar username="Admin" userLevel="Super" />
        
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header card with action */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h1 className="text-xl font-bold text-slate-800">Organizational Hierarchy</h1>
                <p className="text-xs text-slate-400 mt-1">Configure campus branches, colleges, departments, and personnel mapping inline.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 border border-slate-250 rounded-lg px-2 py-1 bg-white">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search nodes..."
                    className="outline-none text-sm"
                    onChange={handleSearchChange}
                  />
                </div>
                <button
                  onClick={() => {
                    setInlineAddingParentId(-1); // -1 triggers inline creation at root
                    setInlineEditingId(null);
                    setNodeType("BRANCH");
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-100 transition-all hover:scale-[1.02]"
                >
                  <Plus size={14} />
                  Add Campus / Root Node
                </button>
              </div>
            </div>

            {/* Tree Container Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[60vh]">
              {inlineAddingParentId === -1 && (
                <div className="mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">New Root Node</span>
                  {renderInlineForm(0, () => {
                    setInlineAddingParentId(null);
                    resetForm();
                  })}
                </div>
              )}

              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="animate-spin text-emerald-700" size={36} />
                </div>
              ) : (
                <div className="flex-1 border border-slate-100 rounded-xl divide-y divide-slate-100 max-h-[75vh] overflow-y-auto bg-white/50">
                  {displayedTree.length > 0 ? (
                    displayedTree.map(node => renderNode(node))
                  ) : (
                    <div className="p-12 text-center text-slate-400">
                      <Folder size={40} className="mx-auto text-slate-200 mb-3" />
                      <span className="text-sm font-medium">No organization nodes created yet.</span>
                      <p className="text-xs text-slate-400 mt-1">Click the button above to seed the hierarchy root campus.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 max-w-md w-full transform scale-100 transition-all duration-300">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4">
              <ShieldAlert size={24} />
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Organizational Node</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-800">"{deleteConfirmNode.name}"</span>? This will permanently delete this node and recursively remove all its sub-departments, units, positions, and associated records. This action is irreversible.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmNode(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
              >
                Keep Node
              </button>
              <button
                onClick={confirmDeleteNode}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-100 transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Premium Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-slate-900 text-white shadow-2xl rounded-2xl p-4 border border-slate-800 flex items-center gap-3.5 w-80 max-w-full">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              toast.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
            }`}>
              {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {toast.type === "success" ? "Success" : "Error"}
              </p>
              <p className="text-xs text-slate-200 mt-0.5 font-medium leading-relaxed truncate">
                {toast.message}
              </p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-200 transition-colors self-start p-0.5 rounded-lg hover:bg-slate-800"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
