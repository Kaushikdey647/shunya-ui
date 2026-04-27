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
    <div className="alert alert-error" role="alert">
      {message}
    </div>
  )
}
