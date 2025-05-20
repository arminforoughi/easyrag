import React, { useState, useRef, useEffect } from 'react';
import { Message } from '@/types';
import { PaperAirplaneIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';

interface ChatProps {
    onSendMessage: (content: string, file?: File) => void;
    messages: Message[];
    isLoading: boolean;
}

export default function Chat({ onSendMessage, messages, isLoading }: ChatProps) {
    const [input, setInput] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
            'audio/*': ['.mp3', '.wav', '.ogg'],
            'video/*': ['.mp4', '.webm', '.mov'],
        },
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                setSelectedFile(acceptedFiles[0]);
            }
        },
        noClick: true, // Disable click to open file dialog
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() || selectedFile) {
            onSendMessage(input, selectedFile || undefined);
            setInput('');
            setSelectedFile(null);
        }
    };

    const handleFileClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,audio/*,video/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                setSelectedFile(file);
            }
        };
        input.click();
    };

    return (
        <div className="flex flex-col h-[600px]">
            {/* Messages Area */}
            <div 
                {...getRootProps()} 
                className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDragActive ? 'bg-blue-50' : ''}`}
            >
                <input {...getInputProps()} />
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                    >
                        <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                                message.role === 'user'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-900'
                            }`}
                        >
                            {message.mediaType && message.mediaUrl && (
                                <div className="mb-2">
                                    {message.mediaType === 'image' && (
                                        <img
                                            src={message.mediaUrl}
                                            alt="Uploaded content"
                                            className="max-w-full rounded-lg"
                                        />
                                    )}
                                    {message.mediaType === 'video' && (
                                        <video
                                            src={message.mediaUrl}
                                            controls
                                            className="max-w-full rounded-lg"
                                        />
                                    )}
                                    {message.mediaType === 'audio' && (
                                        <audio
                                            src={message.mediaUrl}
                                            controls
                                            className="w-full"
                                        />
                                    )}
                                </div>
                            )}
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Selected File Preview */}
            {selectedFile && (
                <div className="px-4 py-2 bg-gray-50 border-t">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                            Selected: {selectedFile.name}
                        </span>
                        <button
                            onClick={() => setSelectedFile(null)}
                            className="text-sm text-red-500 hover:text-red-700"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="border-t p-4">
                <div className="flex items-center space-x-2">
                    <button
                        type="button"
                        onClick={handleFileClick}
                        className="p-2 text-black hover:text-gray-700"
                    >
                        <PaperClipIcon className="h-5 w-5" />
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || (!input.trim() && !selectedFile)}
                        className="p-2 text-black hover:text-gray-700 disabled:text-gray-400"
                    >
                        <PaperAirplaneIcon className="h-5 w-5" />
                    </button>
                </div>
            </form>
        </div>
    );
} 