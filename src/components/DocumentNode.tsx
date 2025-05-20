import { Handle, Position } from 'reactflow';

interface DocumentNodeProps {
    data: {
        label: string;
        fileType?: string;
        mediaType?: string;
        fileSize?: number;
        extractedText?: string;
    };
}

export default function DocumentNode({ data }: DocumentNodeProps) {
    return (
        <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400">
            <Handle type="target" position={Position.Top} className="w-16 !bg-teal-500" />
            <div className="flex flex-col">
                <div className="flex items-center">
                    <div className="rounded-full w-12 h-12 flex items-center justify-center bg-gray-100">
                        {data.mediaType === 'image' && '🖼️'}
                        {data.mediaType === 'video' && '🎥'}
                        {data.mediaType === 'audio' && '🎵'}
                        {data.mediaType === 'text' && '📄'}
                    </div>
                    <div className="ml-2">
                        <div className="text-lg font-bold">{data.label}</div>
                        <div className="text-gray-500">{data.fileType?.toUpperCase()}</div>
                    </div>
                </div>
                {data.fileSize && (
                    <div className="mt-2 text-sm text-gray-500">
                        Size: {data.fileSize} KB
                    </div>
                )}
                {data.extractedText && (
                    <div className="mt-2 text-sm text-gray-600 max-w-xs truncate">
                        {data.extractedText}
                    </div>
                )}
            </div>
            <Handle type="source" position={Position.Bottom} className="w-16 !bg-teal-500" />
        </div>
    );
} 