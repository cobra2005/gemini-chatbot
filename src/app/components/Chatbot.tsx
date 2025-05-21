'use client';

import { useState, useRef, useEffect } from 'react';
import {
    TextInput,
    Button,
    Group,
    Paper,
    Text,
    ScrollArea,
    Avatar,
    Flex,
    Loader,
    ActionIcon,
    useMantineTheme,
    Code,
    Dialog,
    CloseButton,
    Image,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconSend,
    IconRefresh,
    IconMessage,
} from '@tabler/icons-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

interface CodeProps {
    node?: any;
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
}

export default function Chatbot() {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [opened, { toggle, close }] = useDisclosure(false);

    const renderMarkdownContent = (text: string) => {
        return (
            <div>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                        code({
                            node,
                            inline,
                            className,
                            children,
                            ...props
                        }: CodeProps) {
                            const match = /language-(\w+)/.exec(
                                className || '',
                            );
                            return !inline ? (
                                <Code block {...props}>
                                    {children}
                                </Code>
                            ) : (
                                <Code {...props}>{children}</Code>
                            );
                        },
                        table({ node, children, ...props }) {
                            return (
                                <div style={{ overflowX: 'auto' }}>
                                    <table {...props}>{children}</table>
                                </div>
                            );
                        },
                    }}
                >
                    {text}
                </ReactMarkdown>
            </div>
        );
    };

    const genAI = new GoogleGenerativeAI(
        process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
    );

    const handleSendMessage = async () => {
        if (!message.trim() || loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: message,
            sender: 'user',
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setMessage('');
        setLoading(true);

        try {
            const model = genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
            });
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: message }] }],
            });
            const response = await result.response;

            if (!response.text) {
                throw new Error('No response text from Gemini');
            }

            const botMessage: Message = {
                id: Date.now().toString(),
                text: response.text(),
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'An unknown error occurred';
            const errorResponse: Message = {
                id: Date.now().toString(),
                text: `Error: ${errorMessage}`,
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorResponse]);
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = async () => {
        if (messages.length === 0 || loading) return;

        const lastUserMessage = [...messages]
            .reverse()
            .find((m) => m.sender === 'user');
        if (!lastUserMessage) return;

        setLoading(true);
        try {
            const model = genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
            });
            const result = await model.generateContent({
                contents: [
                    { role: 'user', parts: [{ text: lastUserMessage.text }] },
                ],
            });
            const response = await result.response;

            if (response.text) {
                setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastBotIndex = newMessages.findLastIndex(
                        (m) => m.sender === 'bot',
                    );
                    if (lastBotIndex !== -1) {
                        newMessages.splice(lastBotIndex, 1);
                    }
                    return newMessages;
                });

                const botMessage: Message = {
                    id: Date.now().toString(),
                    text: response.text(),
                    sender: 'bot',
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, botMessage]);
            }
        } catch (error) {
            console.error('Error regenerating response:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        scrollAreaRef.current?.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }, [messages]);

    return (
        <>
            {/* Floating action button với Tailwind */}
            {!opened && (
                <button
                    onClick={toggle}
                    className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg cursor-pointer z-50 transition-transform hover:scale-110 hover:bg-blue-700"
                >
                    <IconMessage size={24} />
                </button>
            )}

            {/* Chat Dialog với kết hợp Tailwind và Mantine */}
            <Dialog
                opened={opened}
                onClose={close}
                className="p-0 overflow-hidden max-w-md w-full h-[600px] rounded-lg"
                withCloseButton={false}
                size="auto"
            >
                <div className="flex flex-col h-full max-w-[500px] bg-gray-100 dark:bg-dark-8">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-300 dark:border-dark-5 bg-white dark:bg-dark-7 flex items-center justify-between">
                        <div className="font-semibold text-lg flex items-center gap-2">
                            <Image
                                radius="md"
                                src="/images/image.png"
                                w={20}
                                h={20}
                            />
                            <span>AI Assistant</span>
                        </div>
                        <CloseButton onClick={close} size="md" />
                    </div>

                    {/* Message area */}
                    <ScrollArea
                        viewportRef={scrollAreaRef}
                        className="flex-1 p-4 overflow-y-auto"
                    >
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 dark:text-dark-3">
                                <Image
                                    radius="md"
                                    src="/images/image.png"
                                    w={40}
                                    h={40}
                                />
                                <p className="text-xl font-medium mt-4">
                                    How can I help you today?
                                </p>
                                <p className="text-sm mt-2">
                                    Ask me anything...
                                </p>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`max-w-[80%] mb-4 ${
                                    msg.sender === 'user'
                                        ? 'ml-auto'
                                        : 'mr-auto'
                                }`}
                            >
                                <div className="flex gap-3 items-start">
                                    {msg.sender === 'bot' && (
                                        <Avatar
                                            radius="xl"
                                            size="sm"
                                            className="bg-transparent dark:text-white"
                                        >
                                            <Image
                                                radius="md"
                                                src="/images/image.png"
                                                w={20}
                                                h={20}
                                            />
                                        </Avatar>
                                    )}
                                    <div
                                        className={`p-3 rounded-lg ${
                                            msg.sender === 'user'
                                                ? 'bg-blue-600 text-white rounded-br-sm ml-auto'
                                                : 'bg-white dark:bg-dark-6 shadow-sm rounded-bl-sm'
                                        }`}
                                    >
                                        {msg.sender === 'bot' ? (
                                            <div className="prose dark:prose-invert max-w-none">
                                                {renderMarkdownContent(
                                                    msg.text,
                                                )}
                                            </div>
                                        ) : (
                                            <p className="whitespace-pre-wrap break-words leading-relaxed m-0">
                                                {msg.text
                                                    .split('\n')
                                                    .map((paragraph, i) => (
                                                        <span key={i}>
                                                            {paragraph}
                                                            <br />
                                                        </span>
                                                    ))}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex items-center gap-2 p-3 rounded-md w-fit mr-auto">
                                <Loader size="xs" />
                                <span className="text-sm">
                                    AI is thinking...
                                </span>
                            </div>
                        )}
                    </ScrollArea>

                    {/* Input area */}
                    <div className="p-4 border-t border-gray-300 dark:border-dark-5 bg-white dark:bg-dark-7">
                        <div className="flex items-center gap-2">
                            <ActionIcon
                                variant="subtle"
                                onClick={handleRegenerate}
                                disabled={messages.length === 0 || loading}
                                size="lg"
                            >
                                <IconRefresh size={18} />
                            </ActionIcon>
                            <TextInput
                                placeholder="Type your message..."
                                value={message}
                                onChange={(e) =>
                                    setMessage(e.currentTarget.value)
                                }
                                onKeyDown={(e) =>
                                    e.key === 'Enter' && handleSendMessage()
                                }
                                disabled={loading}
                                radius="xl"
                                size="sm"
                                className="flex-1"
                            />
                            <ActionIcon
                                onClick={handleSendMessage}
                                disabled={!message.trim() || loading}
                                size="lg"
                                radius="xl"
                                color="blue"
                            >
                                <IconSend size={18} />
                            </ActionIcon>
                        </div>
                    </div>
                </div>
            </Dialog>
        </>
    );
}
