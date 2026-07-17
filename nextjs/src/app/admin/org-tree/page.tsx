"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { Loader2, Plus, Trash, Edit, ChevronRight, ChevronDown, Folder, ShieldAlert } from "lucide-react";

interface OrgNode {
  id: int;
  name: string;
  short_name?: string;
  node_type: "BRANCH" | "UNIT" | "DEPARTMENT" | "POSITION";
  parent_id?: number;
  children?: OrgNode[];
}

export default function OrgTreePage() {
  const [tree, setTree] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
  const [deleteConfirmNode, setDeleteConfirmNode] = useState<OrgNode | null>(null);
  
  // Form fields
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [nodeType, setNodeType] = useState<"BRANCH" | "UNIT" | "DEPARTMENT" | "POSITION">("BRANCH");
  const [parentId, setParentId] = useState<number | null>(null);

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

  useEffect(() => {
    fetchTree();
  }, []);

  const toggleExpand = (id: number) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const isEditing = editingNodeId !== null;
      const url = isEditing
        ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/org-nodes/${editingNodeId}`
        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/org-nodes`;
      
      const method = isEditing ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          short_name: shortName || null,
          node_type: nodeType,
          parent_id: parentId,
        })
      });

      if (res.ok) {
        setName("");
        setShortName("");
        setParentId(null);
        setEditingNodeId(null);
        fetchTree();
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
        setDeleteConfirmNode(null);
        fetchTree();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case "BRANCH": return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "UNIT": return "bg-blue-100 text-blue-800 border-blue-300";
      case "DEPARTMENT": return "bg-purple-100 text-purple-800 border-purple-300";
      case "POSITION": return "bg-amber-100 text-amber-800 border-amber-300";
      default: return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  const renderNode = (node: OrgNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded[node.id];

    return (
      <div key={node.id} className="select-none">
        <div 
          className="flex items-center gap-3 p-2 hover:bg-slate-50 border-b border-slate-100 group transition-all"
          style={{ paddingLeft: `${level * 24 + 8}px` }}
        >
          {hasChildren ? (
            <button onClick={() => toggleExpand(node.id)} className="text-slate-500">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-4"></span>
          )}

          <Folder size={16} className="text-emerald-700" />
          <span className="font-semibold text-slate-800 text-sm">
            {node.name} {node.short_name && <span className="text-xs text-slate-500">({node.short_name})</span>}
          </span>

          <span className={`text-[10px] font-bold uppercase border px-2 py-0.5 rounded ml-2 ${getNodeColor(node.node_type)}`}>
            {node.node_type}
          </span>

          <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-all">
            {node.node_type !== "POSITION" && (
              <button 
                onClick={() => {
                  setParentId(node.id);
                  if (node.node_type === "BRANCH") setNodeType("UNIT");
                  else if (node.node_type === "UNIT") setNodeType("DEPARTMENT");
                  else if (node.node_type === "DEPARTMENT") setNodeType("POSITION");
                  setEditingNodeId(null);
                }}
                className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                title="Add Child Node"
              >
                <Plus size={14} />
              </button>
            )}
            <button 
              onClick={() => {
                setEditingNodeId(node.id);
                setName(node.name);
                setShortName(node.short_name || "");
                setNodeType(node.node_type);
                setParentId(node.parent_id || null);
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
      <Sidebar userLevel="Super" />
      <div className="flex-1 flex flex-col">
        <Navbar username="Admin" userLevel="Super" />
        
        <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Organizational Hierarchy</h2>
            
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-700" size={30} />
              </div>
            ) : (
              <div className="flex-1 border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-[70vh] overflow-y-auto">
                {tree.length > 0 ? (
                  tree.map(node => renderNode(node))
                ) : (
                  <div className="p-6 text-center text-slate-400">No organization nodes created yet.</div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {editingNodeId ? "Edit Organizational Node" : "Create Organizational Node"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Node Name</label>
                <input 
                  type="text" 
                  required
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Main Campus or Instructor"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Short Name / Alias</label>
                <input 
                  type="text" 
                  value={shortName} 
                  onChange={(e) => setShortName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. USM-MC"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Node Type</label>
                  <select 
                    value={nodeType} 
                    onChange={(e) => setNodeType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  >
                    <option value="BRANCH">BRANCH</option>
                    <option value="UNIT">UNIT</option>
                    <option value="DEPARTMENT">DEPARTMENT</option>
                    <option value="POSITION">POSITION</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Parent ID</label>
                  <input 
                    type="number" 
                    value={parentId || ""} 
                    onChange={(e) => setParentId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                    placeholder="None (Root)"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2 rounded-lg transition-all"
              >
                {editingNodeId ? "Save Changes" : "Add Node"}
              </button>

              {editingNodeId && (
                <button 
                  type="button"
                  onClick={() => {
                    setEditingNodeId(null);
                    setName("");
                    setShortName("");
                    setParentId(null);
                  }}
                  className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2 rounded-lg transition-all"
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </div>
        </main>
      </div>

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
    </div>
  );
}
