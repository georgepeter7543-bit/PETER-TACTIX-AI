import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * Custom hook providing robust lifecycle management and error guardrails
 * for the Web Speech API (SpeechRecognition).
 */
export function useSpeechRecognition({ onTranscript }) {
  const [isListening, setIsListening] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [isSupported, setIsSupported] = useState(true)

  const recognitionRef = useRef(null)
  const isMountedRef = useRef(true)
  const isListeningRef = useRef(false)
  const onTranscriptRef = useRef(onTranscript)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  // Detect Web Speech API support
  useEffect(() => {
    const hasSpeech = typeof window !== 'undefined' && Boolean(
      window.SpeechRecognition || window.webkitSpeechRecognition
    )
    setIsSupported(hasSpeech)
  }, [])

  // 3. Clean Teardown on Unmount:
  // Explicitly aborts recognition, removes all handlers, and releases instance to prevent memory leaks
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null
          recognitionRef.current.onresult = null
          recognitionRef.current.onerror = null
          recognitionRef.current.onend = null
          recognitionRef.current.abort()
        } catch (e) {
          // Gracefully absorb DOMExceptions on unmount
        }
        recognitionRef.current = null
      }
    }
  }, [])

  const clearError = useCallback(() => {
    setErrorMessage(null)
  }, [])

  // 1. Prevent duplicate initialization by cleanly tearing down any previous instance
  const cleanupExistingInstance = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null
        recognitionRef.current.onresult = null
        recognitionRef.current.onerror = null
        recognitionRef.current.onend = null
        recognitionRef.current.abort()
      } catch (e) {
        // Silently ignore abort exceptions
      }
      recognitionRef.current = null
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        try {
          recognitionRef.current.abort()
        } catch (err) {
          // Ignore
        }
      }
    }
    if (isMountedRef.current) {
      setIsListening(false)
      isListeningRef.current = false
    }
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognition = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null

    if (!SpeechRecognition) {
      setIsSupported(false)
      setErrorMessage('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
      return
    }

    // Guardrail: Clean teardown of any existing instance before re-instantiating
    cleanupExistingInstance()
    setErrorMessage(null)

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'
      recognition.maxAlternatives = 1

      // Track startup state
      recognition.onstart = () => {
        if (isMountedRef.current) {
          setIsListening(true)
          isListeningRef.current = true
        }
      }

      // Stream transcript results cleanly
      recognition.onresult = (event) => {
        if (!isMountedRef.current) return
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i]
          if (item.isFinal) {
            finalTranscript += item[0].transcript
          } else {
            interimTranscript += item[0].transcript
          }
        }

        const text = finalTranscript || interimTranscript
        if (text && onTranscriptRef.current) {
          onTranscriptRef.current(text, Boolean(finalTranscript))
        }
      }

      // 2. Comprehensive Error Catching
      recognition.onerror = (event) => {
        if (!isMountedRef.current) return
        const error = event.error

        if (error === 'no-speech') {
          // Silently reset listening state without crashing the app
          setIsListening(false)
          isListeningRef.current = false
        } else if (error === 'not-allowed' || error === 'service-not-allowed') {
          // Alert user to grant microphone permissions in browser settings
          setIsListening(false)
          isListeningRef.current = false
          setErrorMessage('Microphone access denied. Please allow microphone permissions in your browser settings.')
        } else if (error === 'network') {
          // Handle temporary network drops smoothly
          setIsListening(false)
          isListeningRef.current = false
          setErrorMessage('Speech recognition network error. Please check your internet connection.')
        } else if (error === 'aborted') {
          // Silently reset listening state when aborted
          setIsListening(false)
          isListeningRef.current = false
        } else {
          // Fallback graceful error capture
          setIsListening(false)
          isListeningRef.current = false
          setErrorMessage(`Speech recognition error (${error}). Please try again.`)
        }
      }

      // 1. Lifecycle Guardrail: Handle onend cleanly so when recognition stops naturally or times out,
      // it updates state without throwing unhandled exceptions.
      recognition.onend = () => {
        if (isMountedRef.current) {
          setIsListening(false)
          isListeningRef.current = false
        }
        recognitionRef.current = null
      }

      recognitionRef.current = recognition

      // Wrap recognition.start() inside try-catch to capture DOMExceptions
      // (e.g. if start() is called while already active or blocked)
      try {
        recognition.start()
      } catch (domException) {
        if (isMountedRef.current) {
          setIsListening(false)
          isListeningRef.current = false
          setErrorMessage('Unable to start speech recognition. Please try again.')
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setIsListening(false)
        isListeningRef.current = false
        setErrorMessage('Failed to initialize speech recognition.')
      }
    }
  }, [cleanupExistingInstance])

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening()
    } else {
      startListening()
    }
  }, [startListening, stopListening])

  return {
    isListening,
    isSupported,
    errorMessage,
    clearError,
    startListening,
    stopListening,
    toggleListening,
  }
}
