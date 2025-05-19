'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Container, TextInput, Button, Group, Paper, Text, 
  ScrollArea, Avatar, Flex, Loader, ActionIcon,
  useMantineTheme, Code, List, Blockquote
} from '@mantine/core'
import { createStyles } from '@mantine/styles'
import { IconSend, IconRobot, IconUser, IconRefresh } from '@tabler/icons-react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
}

interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const useStyles = createStyles((theme) => ({
  container: {
    height: '90vh',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '800px',
    margin: '0 auto',
    padding: 0,
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
    [theme.fn.smallerThan('sm')]: {
      maxWidth: '100%',
    },
  },
  chatContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  messageArea: {
    flex: 1,
    padding: theme.spacing.md,
    overflowY: 'auto',
  },
  userMessageContainer: {
    maxWidth: '100%',
    marginLeft: 'auto',
    marginBottom: theme.spacing.md,
  },
  botMessageContainer: {
    maxWidth: '100%',
    marginRight: 'auto',
    marginBottom: theme.spacing.md,
  },
  userMessage: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.blue[8] : theme.colors.blue[6],
    color: theme.white,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
    maxWidth: '90%',
    marginLeft: 'auto',
  },
  botMessage: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[2],
    borderRadius: theme.radius.lg,
    borderBottomLeftRadius: theme.radius.xs,
    padding: theme.spacing.md,
    maxWidth: '90%',
    marginRight: 'auto',
  },
  inputArea: {
    padding: theme.spacing.md,
    borderTop: `1px solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[3]
    }`,
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
  },
  inputContainer: {
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
  },
  avatar: {
    backgroundColor: 'transparent',
    color: theme.colorScheme === 'dark' ? theme.white : theme.black,
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    width: 'fit-content',
    marginRight: 'auto',
  },
  messageContent: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.6,
    fontSize: theme.fontSizes.md,
    margin: 0
  },
  emptyState: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[6],
  },
  regenerateButton: {
    marginTop: theme.spacing.sm,
  },
  markdownContainer: {
    '& h1, h2, h3, h4, h5, h6': {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xs,
      fontWeight: 600,
    },
    '& p': {
      marginBottom: theme.spacing.sm,
      lineHeight: 1.7,
    },
    '& ul, ol': {
      marginBottom: theme.spacing.sm,
      paddingLeft: theme.spacing.lg,
    },
    '& li': {
      marginBottom: theme.spacing.xs,
    },
    '& pre': {
      borderRadius: theme.radius.sm,
      marginBottom: theme.spacing.sm,
      overflow: 'auto',
    },
    '& code': {
      fontFamily: 'monospace',
      fontSize: theme.fontSizes.sm,
    },
    '& blockquote': {
      borderLeft: `4px solid ${
        theme.colorScheme === 'dark' ? theme.colors.gray[6] : theme.colors.gray[4]
      }`,
      paddingLeft: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      color: theme.colorScheme === 'dark' ? theme.colors.gray[4] : theme.colors.gray[7],
    },
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: theme.spacing.sm,
    },
    '& th, td': {
      border: `1px solid ${
        theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]
      }`,
      padding: theme.spacing.xs,
    },
    '& th': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[1],
    },
  },
}));

const renderMarkdownContent = (text: string) => {
    const { classes } = useStyles();
    return (
        <div className={classes.markdownContainer}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                code({node, inline, className, children, ...props}: CodeProps) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline ? (
                    <Code block {...props}>
                        {children}
                    </Code>
                    ) : (
                    <Code {...props}>{children}</Code>
                    )
                },
                table({node, children, ...props}) {
                    return (
                    <div style={{ overflowX: 'auto' }}>
                        <table {...props}>{children}</table>
                    </div>
                    )
                }
                }}
            >
                {text}
            </ReactMarkdown>
        </div>
    )
  }

export default function Chatbot() {
  const { classes } = useStyles()
  const theme = useMantineTheme()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '')

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return
    
    const userMessage: Message = { 
      id: Date.now().toString(),
      text: message, 
      sender: 'user',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setMessage('')
    setLoading(true)
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: message }] }],
      })
      const response = await result.response
      
      if (!response.text) {
        throw new Error('No response text from Gemini')
      }
      
      const botMessage: Message = { 
        id: Date.now().toString(),
        text: response.text(), 
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Error calling Gemini API:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      const errorResponse: Message = { 
        id: Date.now().toString(),
        text: `Error: ${errorMessage}`, 
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorResponse])
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (messages.length === 0 || loading) return
    
    const lastUserMessage = [...messages].reverse().find(m => m.sender === 'user')
    if (!lastUserMessage) return
    
    setLoading(true)
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: lastUserMessage.text }] }],
      })
      const response = await result.response
      
      if (response.text) {
        // Remove last bot response if exists
        setMessages(prev => {
          const newMessages = [...prev]
          const lastBotIndex = newMessages.findLastIndex(m => m.sender === 'bot')
          if (lastBotIndex !== -1) {
            newMessages.splice(lastBotIndex, 1)
          }
          return newMessages
        })
        
        const botMessage: Message = { 
          id: Date.now().toString(),
          text: response.text(), 
          sender: 'bot',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, botMessage])
      }
    } catch (error) {
      console.error('Error regenerating response:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  return (
    <Container className={classes.container} p={0}>
      <div className={classes.chatContainer}>
        <ScrollArea viewportRef={scrollAreaRef} className={classes.messageArea}>
          {messages.length === 0 && (
            <div className={classes.emptyState}>
              <IconRobot size={64} stroke={1.5} />
              <Text size="xl" mt="md" fw={500}>How can I help you today?</Text>
              <Text size="sm" mt="xs">Ask me anything...</Text>
            </div>
          )}

        {messages.map((msg) => (
        <div 
            key={msg.id} 
            className={msg.sender === 'user' ? classes.userMessageContainer : classes.botMessageContainer}
        >
            <Flex gap="sm" align="flex-start">
            <Avatar radius="xl" size="sm" className={classes.avatar}>
                {msg.sender === 'user' ? <IconUser size={16} /> : <IconRobot size={16} />}
            </Avatar>
            <Paper className={msg.sender === 'user' ? classes.userMessage : classes.botMessage}>
                {msg.sender === 'bot' ? (
                renderMarkdownContent(msg.text)
                ) : (
                <Text className={classes.messageContent}>
                    {msg.text.split('\n').map((paragraph, i) => (
                    <span key={i}>
                        {paragraph}
                        <br />
                    </span>
                    ))}
                </Text>
                )}
            </Paper>
            </Flex>
        </div>
        ))}

          {loading && (
            <div className={classes.typingIndicator}>
              <Loader size="xs" />
              <Text size="sm">AI is thinking...</Text>
            </div>
          )}
        </ScrollArea>

        <div className={classes.inputArea}>
          <div className={classes.inputContainer}>
            <Group gap="sm" grow>
              <TextInput
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={loading}
                radius="xl"
                size="md"
                rightSection={
                  <ActionIcon 
                    variant="subtle" 
                    onClick={handleRegenerate}
                    disabled={messages.length === 0 || loading}
                    size="lg"
                  >
                    <IconRefresh size={20} />
                  </ActionIcon>
                }
              />
              <Button 
                onClick={handleSendMessage}
                leftSection={<IconSend size={20} />}
                loading={loading}
                radius="xl"
                size="md"
                disabled={!message.trim()}
              >
                Send
              </Button>
            </Group>
          </div>
        </div>
      </div>
    </Container>
  )
}