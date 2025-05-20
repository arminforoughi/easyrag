'use client';

import { useState } from 'react';
import { Neo4jInterface } from '@/lib/neo4j';
import Link from 'next/link';

interface QueryExample {
    name: string;
    description: string;
    query: string;
    category: 'basic' | 'advanced' | 'analysis';
}

const queryExamples: QueryExample[] = [
    {
        name: 'Find All Documents',
        description: 'Get all documents in the database with their basic properties',
        query: 'MATCH (d:Document) RETURN d',
        category: 'basic'
    },
    {
        name: 'Find Related Documents',
        description: 'Find documents that are related to each other through any relationship',
        query: 'MATCH (d1:Document)-[r]-(d2:Document) RETURN d1, r, d2',
        category: 'basic'
    },
    {
        name: 'Find Documents by Media Type',
        description: 'Find all documents of a specific media type (e.g., video)',
        query: 'MATCH (d:Document) WHERE d.mediaType = "video" RETURN d',
        category: 'basic'
    },
    {
        name: 'Find Documents with Similar Content',
        description: 'Find documents that have similar content based on the RELATED_TO relationship',
        query: 'MATCH (d1:Document)-[r:RELATED_TO]->(d2:Document) WHERE r.type = "similar_content" RETURN d1, r, d2',
        category: 'advanced'
    },
    {
        name: 'Find Document Clusters',
        description: 'Find groups of documents that are highly interconnected',
        query: 'MATCH (d1:Document)-[r:RELATED_TO]-(d2:Document) WITH d1, d2, count(r) as connectionStrength WHERE connectionStrength > 1 RETURN d1, d2, connectionStrength',
        category: 'advanced'
    },
    {
        name: 'Find Most Connected Documents',
        description: 'Find documents that have the most relationships with other documents',
        query: 'MATCH (d:Document)-[r]-(other:Document) WITH d, count(r) as connectionCount RETURN d, connectionCount ORDER BY connectionCount DESC LIMIT 10',
        category: 'analysis'
    }
];

export default function GraphQueryPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'basic' | 'advanced' | 'analysis'>('all');

    const handleRunQuery = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/graph/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                throw new Error('Failed to execute query');
            }

            const data = await response.json();
            setResults(data.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExampleClick = (example: QueryExample) => {
        setQuery(example.query);
    };

    const filteredExamples = selectedCategory === 'all' 
        ? queryExamples 
        : queryExamples.filter(ex => ex.category === selectedCategory);

    return (
        <main className="min-h-screen bg-gray-100 text-black">
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-black">
                        Graph Query Explorer
                    </h1>
                    <Link
                        href="/graph"
                        className="group rounded-lg border border-transparent px-5 py-2 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
                    >
                        <span className="flex items-center">
                            View Graph Visualization
                            <span className="ml-2 inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                                →
                            </span>
                        </span>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Query Input Section */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-semibold mb-4 text-black">Run Query</h2>
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full h-32 p-2 border rounded-lg mb-4 font-mono text-sm text-black placeholder-gray-500"
                            placeholder="Enter your Cypher query here..."
                        />
                        <button
                            onClick={handleRunQuery}
                            disabled={isLoading}
                            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
                        >
                            {isLoading ? 'Running...' : 'Run Query'}
                        </button>
                        {error && (
                            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Results Section */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-semibold mb-4 text-black">Results</h2>
                        {results.length > 0 ? (
                            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-black">
                                {JSON.stringify(results, null, 2)}
                            </pre>
                        ) : (
                            <p className="text-gray-500">No results to display</p>
                        )}
                    </div>
                </div>

                {/* Examples Section */}
                <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-black">Query Examples</h2>
                        <div className="flex gap-2">
                            {(['all', 'basic', 'advanced', 'analysis'] as const).map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-3 py-1 rounded-lg ${
                                        selectedCategory === category
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {category.charAt(0).toUpperCase() + category.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredExamples.map((example) => (
                            <div
                                key={example.name}
                                className="border rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
                                onClick={() => handleExampleClick(example)}
                            >
                                <h3 className="font-semibold mb-2 text-black">{example.name}</h3>
                                <p className="text-sm text-gray-600 mb-2">{example.description}</p>
                                <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto text-black">
                                    {example.query}
                                </pre>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
} 