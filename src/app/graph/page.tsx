'use client';

import { useEffect, useState } from 'react';
import ReactFlow, { 
    Node, 
    Edge, 
    Background, 
    Controls, 
    MiniMap,
    NodeTypes,
    useNodesState,
    useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import DocumentNode from '@/components/DocumentNode';

interface GraphData {
    nodes: Node[];
    edges: Edge[];
}

const nodeTypes: NodeTypes = {
    Document: DocumentNode,
};

export default function GraphPage() {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGraphData = async () => {
            try {
                const response = await fetch('/api/graph');
                if (!response.ok) {
                    throw new Error('Failed to fetch graph data');
                }
                const data: GraphData = await response.json();
                
                // Update node types to use DocumentNode
                const updatedNodes = data.nodes.map(node => ({
                    ...node,
                    type: 'Document'
                }));
                
                setNodes(updatedNodes);
                setEdges(data.edges);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchGraphData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-500 text-xl">{error}</div>
            </div>
        );
    }

    return (
        <div className="w-full h-screen">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
            >
                <Background />
                <Controls />
                <MiniMap />
            </ReactFlow>
        </div>
    );
} 