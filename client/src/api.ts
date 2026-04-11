import axios, { AxiosInstance } from 'axios'
import toast from 'react-hot-toast'
import { getApiMessage } from './helpers/apiMessages'

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export function getStoredToken() {
  const token = localStorage.getItem('ts_token')
  return typeof token === 'string' && token.trim() ? token : null
}

export function clearStoredAuth() {
  localStorage.removeItem('ts_user')
  localStorage.removeItem('ts_token')
  sessionStorage.removeItem('ts_user')
}

export function buildAuthHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers ?? undefined)
  const token = getStoredToken()

  if (token && !nextHeaders.has('Authorization')) {
    nextHeaders.set('Authorization', `Bearer ${token}`)
  }

  return nextHeaders
}

export function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

export async function authFetch(path: string, init: RequestInit = {}) {
  return fetch(apiUrl(path), {
    ...init,
    credentials: init.credentials ?? 'include',
    headers: buildAuthHeaders(init.headers),
  })
}

export const api = {
  auth: {
    login(payload: { email: string; password: string }) {
      return authFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
    me() {
      return authFetch('/auth/me', {
        method: 'GET',
        cache: 'no-store',
      })
    },
    refresh() {
      return authFetch('/auth/refresh', {
        method: 'POST',
      })
    },
    logout() {
      return authFetch('/auth/logout', {
        method: 'POST',
      })
    },
    changePassword(payload: {
      current_password: string
      password: string
      password_confirmation: string
    }) {
      const token = getStoredToken()

      return authFetch('/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })
    },
  },
  owner: {
    properties() {
      return authFetch('/owner/properties', {
        cache: 'no-store',
      })
    },
    managers() {
      return authFetch('/owner/managers', {
        cache: 'no-store',
      })
    },
    createManager(payload: {
      name: string
      email: string
      password: string
      password_confirmation: string
    }) {
      return authFetch('/owner/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
    createProperty(payload: {
      name: string
      address: string
      total_units: number
      manager_id: number | null
    }) {
      return authFetch('/owner/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
    removeManager(id: number) {
      return authFetch(`/owner/managers/${id}`, {
        method: 'DELETE',
      })
    },
    removeProperty(id: number) {
      return authFetch(`/owner/properties/${id}`, {
        method: 'DELETE',
      })
    },
    assignManager(propertyId: number, managerId: number | null) {
      return authFetch(`/owner/properties/${propertyId}/manager`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_id: managerId,
        }),
      })
    },
  },
  manager: {
    dashboard() {
      return authFetch('/manager/dashboard', {
        cache: 'no-store',
      })
    },
    complaints() {
      return authFetch('/manager/complaints', {
        cache: 'no-store',
      })
    },
    announcements() {
      return authFetch('/announcements', {
        cache: 'no-store',
      })
    },
    createUnit(payload: {
      unit_number: string
      floor: string
      rent_amount: number | null
      status: 'vacant' | 'occupied'
    }) {
      return authFetch('/manager/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
    assignTenant(
      unitId: string,
      payload: {
        unit_id: string
        name: string
        email: string
        date_of_birth: string | null
        move_in_date: string | null
        lease_start: string | null
        lease_end: string | null
      }
    ) {
      return authFetch(`/manager/units/${unitId}/assign-tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
    removeTenant(unitId: string) {
      return authFetch(`/manager/units/${unitId}/tenant`, {
        method: 'DELETE',
      })
    },
    updateComplaint(id: number, status: string) {
      return authFetch(`/manager/complaints/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    },
    publishAnnouncement(payload: {
      title: string
      message: string
      target_role: string
    }) {
      return authFetch('/manager/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
    replyToComplaint(id: number, managerReply: string) {
      return authFetch(`/manager/complaints/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_reply: managerReply }),
      })
    },
  },
  tenant: {
    dashboard() {
      return authFetch('/tenant/dashboard', {
        cache: 'no-store',
      })
    },
    createCheckoutSession() {
      return authFetch('/tenant/payments/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    },
    verifyPayment(sessionId: string) {
      return authFetch(`/tenant/payments/verify?session_id=${encodeURIComponent(sessionId)}`)
    },
    submitComplaint(payload: {
      title: string
      category: string
      priority: string
      description: string
    }) {
      return authFetch('/tenant/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
  },
  invitation: {
    show(token: string) {
      return authFetch(`/tenant-invitations/${token}`, {
        cache: 'no-store',
      })
    },
    accept(
      token: string,
      payload: { password: string; password_confirmation: string }
    ) {
      return authFetch(`/tenant-invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
  },
}

type ApiError = {
  message?: string
  response?: {
    status: number
    data?: {
      message?: string
      error?: string
      errors?: unknown
    }
  }
  request?: unknown
}

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: 'http://localhost:8000',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  async getSession() {
    try {
      return (await this.client.get('/api/session')).data
    } catch (error) {
      this.handleError(error as ApiError)
    }
  }

  async createSession(name: string, duration: number, username: string, password: string) {
    try {
      if (!username || !password) {
        toast.error('Credentials are required')
        return
      }

      return (
        await this.client.post('/api/session', {
          name,
          duration,
          username,
          password,
        })
      ).data
    } catch (error) {
      this.handleError(error as ApiError)
    }
  }

  async updateSession(sessionId: number, active: boolean, username: string, password: string) {
    try {
      if (!username || !password) {
        toast.error('Credentials are required')
        return
      }

      return (
        await this.client.put('/api/session', {
          session_id: sessionId,
          active,
          username,
          password,
        })
      ).data
    } catch (error) {
      this.handleError(error as ApiError)
    }
  }

  async submitAttendance(roll: number) {
    try {
      return (
        await this.client.post('/api/attendance', {
          roll,
        })
      ).data
    } catch (error) {
      this.handleError(error as ApiError)
    }
  }

  async viewSessions(username: string, password: string) {
    try {
      if (!username || !password) {
        toast.error('Credentials are required')
        return
      }

      return (
        await this.client.post('/api/sessions', {
          username,
          password,
        })
      ).data
    } catch (error) {
      this.handleError(error as ApiError)
    }
  }

  private handleError(error: ApiError) {
    if (error.response) {
      console.error(`API Error: ${error.response.status} - ${error.response.data?.message}`)
    } else if (error.request) {
      console.error('API Error: No response received', error.request)
    } else {
      console.error('API Error:', error.message)
    }

    toast.error(getApiMessage(error.response?.data, error.message || 'Something went wrong'))
  }
}

export default ApiClient
