'use client';

import { useState } from 'react';
import Chat from '@/components/Chat';
import DatabaseManager from '@/components/DatabaseManager';
import { Message, SearchResult } from '@/types';
import axios from 'axios';
import Link from 'next/link';

export default function Home() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDatabaseId, setSelectedDatabaseId] = useState<string | null>(null);

    const handleSendMessage = async (content: string, file?: File) => {
        if (!selectedDatabaseId) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Please select a database first.',
                timestamp: new Date()
            }]);
            return;
        }

        // Add user message
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'user',
            content,
            timestamp: new Date()
        }]);
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('query', content);
            formData.append('databaseId', selectedDatabaseId);
            
            if (file) {
                formData.append('files', file);
            }

            const response = await axios.post('/api/chat', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: response.data.response,
                documents: response.data.documents,
                timestamp: new Date()
            }]);
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Sorry, there was an error processing your request.',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const getMediaType = (file: File): 'image' | 'audio' | 'video' => {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type.startsWith('audio/')) return 'audio';
        if (file.type.startsWith('video/')) return 'video';
        return 'image'; // Default fallback
    };

    return (
        <main className="min-h-screen bg-gray-100">
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-black">
                        EasyRag
                    </h1>
                    <div className="flex gap-4">
                        <Link
                            href="/graph-query"
                            className="group rounded-lg border border-transparent px-5 py-2 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
                        >
                            <span className="flex items-center text-black">
                                Graph Query Explorer
                                <span className="ml-2 inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                                    →
                                </span>
                            </span>
                        </Link>
                        <Link
                            href="/graph"
                            className="group rounded-lg border border-transparent px-5 py-2 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
                        >
                            <span className="flex items-center text-black">
                                View Document Graph
                                <span className="ml-2 inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                                    →
                                </span>
                            </span>
                        </Link>
                    </div>
                </div>
                
                {/* Database Manager */}
                <DatabaseManager
                    onDatabaseSelect={setSelectedDatabaseId}
                    selectedDatabaseId={selectedDatabaseId}
                />

                {/* Chat Interface */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <Chat
                        onSendMessage={handleSendMessage}
                        messages={messages}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        </main>
    );
}
