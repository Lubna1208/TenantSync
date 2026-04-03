import axios, { AxiosInstance } from 'axios'
import toast from 'react-hot-toast'

type ApiError = {
  message?: string
  response?: {
    status: number
    data?: {
      message?: string
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

    toast.error(error.message || 'Something went wrong')
  }
}

export default ApiClient
