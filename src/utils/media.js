export const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
export const imageAcceptValue = [...allowedImageTypes, ...allowedImageExtensions].join(',')
export const maxImageUploadSize = 10 * 1024 * 1024
const imageTypesByExtension = new Map([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
  ['gif', 'image/gif'],
])

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes > 9 * 1024 * 1024 ? 0 : 1)} MB`
}

export function validateImageFile(file) {
  if (!file) {
    throw new Error('Choose an image first.')
  }

  if (!getImageContentType(file)) {
    throw new Error('Use a JPEG, PNG, WebP, or GIF image.')
  }

  if (file.size > maxImageUploadSize) {
    throw new Error(`Images must be ${formatFileSize(maxImageUploadSize)} or smaller.`)
  }
}

export function getImageContentType(file) {
  if (allowedImageTypes.includes(file?.type)) {
    return file.type
  }

  const extension = String(file?.name ?? '').split('.').pop()?.toLowerCase()
  return imageTypesByExtension.get(extension) ?? ''
}

function uploadWithProgress(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', uploadUrl)
    request.setRequestHeader('Content-Type', file.type)

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== 'function') return
      onProgress(Math.round((event.loaded / event.total) * 100))
    }

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve()
        return
      }

      reject(new Error('Image upload failed. Check the R2 bucket CORS settings.'))
    }

    request.onerror = () => reject(new Error('Image upload failed.'))
    request.send(file)
  })
}

async function uploadImage(supabase, file, onProgress) {
  validateImageFile(file)
  const contentType = getImageContentType(file)
  onProgress?.(1)

  const { data, error } = await supabase.functions.invoke('get-upload-url', {
    body: {
      fileName: file.name,
      contentType,
      fileSize: file.size,
    },
  })

  if (error) {
    throw new Error(error.message || 'Could not prepare image upload.')
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  if (!data?.uploadUrl || !data?.publicUrl) {
    throw new Error('Upload service returned an invalid response.')
  }

  await uploadWithProgress(data.uploadUrl, file, onProgress)
  onProgress?.(100)

  return data.publicUrl
}

export async function uploadChatImage(supabase, file, onProgress) {
  const publicUrl = await uploadImage(supabase, file, onProgress)

  return {
    mediaUrl: publicUrl,
    mediaType: 'image',
  }
}

export async function uploadProfileImage(supabase, file, onProgress) {
  return uploadImage(supabase, file, onProgress)
}

export function messageHasMedia(message) {
  return Boolean(message?.media_url && (message?.media_type === 'image' || message?.media_type === 'gif'))
}

export function mediaPreviewLabel(message) {
  if (!messageHasMedia(message)) return message?.body ?? ''
  const prefix = message.media_type === 'gif' ? 'GIF' : 'Image'
  return message.body ? `${prefix}: ${message.body}` : prefix
}