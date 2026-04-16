import { describe, it, expect, beforeEach } from 'vitest'
import { useToastStore } from '../store'

describe('Toast Store', () => {
  beforeEach(() => {
    // 각 테스트 전에 store 리셋
    useToastStore.setState({ toasts: [] })
  })

  it('should add a toast message', () => {
    const { addToast, toasts } = useToastStore.getState()

    addToast('Test message', 'success')

    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe('Test message')
    expect(toasts[0].type).toBe('success')
  })

  it('should remove a toast by id', () => {
    const { addToast, removeToast, toasts } = useToastStore.getState()

    addToast('Message 1', 'success')
    const toastId = toasts[0].id

    removeToast(toastId)

    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('should add multiple toasts', () => {
    const { addToast } = useToastStore.getState()

    addToast('Message 1', 'success')
    addToast('Message 2', 'error')
    addToast('Message 3', 'info')

    expect(useToastStore.getState().toasts).toHaveLength(3)
  })

  it('should support different toast types', () => {
    const { addToast, toasts } = useToastStore.getState()

    addToast('Success', 'success')
    addToast('Error', 'error')
    addToast('Info', 'info')
    addToast('Warning', 'warning')

    const types = toasts.map(t => t.type)
    expect(types).toEqual(['success', 'error', 'info', 'warning'])
  })

  it('should allow custom duration', () => {
    const { addToast, toasts } = useToastStore.getState()

    addToast('Quick message', 'success', 1000)

    expect(toasts[0].duration).toBe(1000)
  })
})
