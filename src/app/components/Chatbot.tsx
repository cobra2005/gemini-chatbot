'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Container, 
  TextInput, 
  Button, 
  Group, 
  Paper, 
  Text, 
  ScrollArea,
  Avatar,
  Flex,
  rem
} from '@mantine/core'
import { IconSend } from '@tabler/icons-react'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface Message {
  text: string
  sender: 'user' | 'bot'
}

export default function Chatbot() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  // Khởi tạo Gemini API
  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '')
  
  const handleSendMessage = async () => {
    if (!message.trim()) return
    
    const userMessage: Message = { text: message, sender: 'user' }
    setMessages(prev => [...prev, userMessage])
    setMessage('')
    setLoading(true)
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      const result = await model.generateContent(message)
      const response = await result.response
      
      if (!response.text) {
        throw new Error('No response text from Gemini')
      }
      
      const botMessage: Message = { text: response.text(), sender: 'bot' }
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Error calling Gemini API:', error)
      let errorMessage = 'Sorry, I encountered an error. Please try again.'
      
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`
      }
      
      const errorResponse: Message = { 
        text: errorMessage, 
        sender: 'bot' 
      }
      setMessages(prev => [...prev, errorResponse])
    } finally {
      setLoading(false)
    }
  }
  
  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])
  
  return (
    <Container size="sm" p={0}>
      <Paper withBorder shadow="sm" p="md">
        <ScrollArea h={400} ref={scrollAreaRef}>
          {messages.map((msg, index) => (
            <Flex 
              key={index} 
              gap="sm" 
              mb="md" 
              direction={msg.sender === 'user' ? 'row-reverse' : 'row'}
            >
              <Avatar 
                radius="xl" 
                color={msg.sender === 'user' ? 'blue' : 'green'}
              >
                {msg.sender === 'user' ? 'You' : 'AI'}
              </Avatar>
              <Paper 
                p="sm" 
                withBorder 
                bg={msg.sender === 'user' ? 'blue.1' : 'gray.1'}
                style={{ maxWidth: '80%' }}
              >
                <Text>{msg.text}</Text>
              </Paper>
            </Flex>
          ))}
        </ScrollArea>
        
        <Group mt="md" grow>
          <TextInput
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={loading}
          />
          <Button 
            onClick={handleSendMessage}
            leftSection={<IconSend style={{ width: rem(16), height: rem(16) }} />}
            loading={loading}
          >
            Send
          </Button>
        </Group>
      </Paper>
    </Container>
  )
}