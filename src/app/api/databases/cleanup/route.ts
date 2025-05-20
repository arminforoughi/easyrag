import { NextRequest, NextResponse } from 'next/server';
import { Neo4jInterface } from '@/lib/neo4j';

const neo4j = new Neo4jInterface(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'your_password'
);

export async function POST(req: NextRequest) {
    try {
        const result = await neo4j.cleanup_database();
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error cleaning up database:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
} 