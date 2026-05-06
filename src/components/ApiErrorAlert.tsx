import { Alert } from '@mantine/core'
import { ApiError } from '../api/client'

export default function ApiErrorAlert({ error }: { error: unknown }) {
  if (!error) return null
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error)
  return (
    <Alert color="red" variant="light" role="alert">
      {message}
    </Alert>
  )
}
