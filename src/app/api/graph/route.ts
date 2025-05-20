import { NextRequest, NextResponse } from 'next/server';
import { Neo4jInterface } from '@/lib/neo4j';

const neo4j = new Neo4jInterface(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
);

export async function GET(request: NextRequest) {
    try {
        const session = neo4j.driver.session();

        // First, create relationships between documents based on content similarity
        await session.run(`
            MATCH (d1:Document)
            MATCH (d2:Document)
            WHERE d1.id < d2.id
            AND (
                // Check for similar content
                d1.content CONTAINS d2.content OR
                d2.content CONTAINS d1.content OR
                // Check for similar extracted text
                d1.extractedText CONTAINS d2.extractedText OR
                d2.extractedText CONTAINS d1.extractedText OR
                // Check for same media type
                d1.mediaType = d2.mediaType
            )
            MERGE (d1)-[r:RELATED_TO {
                type: CASE
                    WHEN d1.content CONTAINS d2.content OR d2.content CONTAINS d1.content THEN 'similar_content'
                    WHEN d1.extractedText CONTAINS d2.extractedText OR d2.extractedText CONTAINS d1.extractedText THEN 'similar_text'
                    WHEN d1.mediaType = d2.mediaType THEN 'same_type'
                    ELSE 'related'
                END
            }]->(d2)
        `);

        // Now fetch the graph with relationships
        const result = await session.run(`
            MATCH (n:Document)
            OPTIONAL MATCH (n)-[r:RELATED_TO]->(m:Document)
            RETURN n, r, m
        `);

        const nodes = new Map();
        const edges = [];

        // Process nodes
        result.records.forEach(record => {
            const node = record.get('n');
            if (node && !nodes.has(node.identity.toString())) {
                nodes.set(node.identity.toString(), {
                    id: node.identity.toString(),
                    type: 'Document',
                    data: {
                        label: node.properties.filename || node.properties.name || 'Document',
                        fileType: node.properties.fileType,
                        mediaType: node.properties.mediaType,
                        fileSize: node.properties.fileSize,
                        extractedText: node.properties.extractedText,
                        ...node.properties
                    },
                    position: {
                        x: Math.random() * 800,
                        y: Math.random() * 600
                    }
                });
            }

            const targetNode = record.get('m');
            if (targetNode && !nodes.has(targetNode.identity.toString())) {
                nodes.set(targetNode.identity.toString(), {
                    id: targetNode.identity.toString(),
                    type: 'Document',
                    data: {
                        label: targetNode.properties.filename || targetNode.properties.name || 'Document',
                        fileType: targetNode.properties.fileType,
                        mediaType: targetNode.properties.mediaType,
                        fileSize: targetNode.properties.fileSize,
                        extractedText: targetNode.properties.extractedText,
                        ...targetNode.properties
                    },
                    position: {
                        x: Math.random() * 800,
                        y: Math.random() * 600
                    }
                });
            }

            // Process relationships
            const relationship = record.get('r');
            if (relationship) {
                edges.push({
                    id: relationship.identity.toString(),
                    source: relationship.start.toString(),
                    target: relationship.end.toString(),
                    label: relationship.properties.type,
                    style: {
                        stroke: getRelationshipColor(relationship.properties.type)
                    },
                    animated: true
                });
            }
        });

        await session.close();

        return NextResponse.json({
            nodes: Array.from(nodes.values()),
            edges
        });
    } catch (error) {
        console.error('Error fetching graph data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch graph data' },
            { status: 500 }
        );
    }
}

function getRelationshipColor(type: string): string {
    switch (type) {
        case 'similar_content':
            return '#2563eb'; // blue
        case 'similar_text':
            return '#16a34a'; // green
        case 'same_type':
            return '#9333ea'; // purple
        default:
            return '#6b7280'; // gray
    }
} 