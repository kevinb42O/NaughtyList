export const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
export const allowedAudioTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/aac']
export const allowedAudioExtensions = ['.webm', '.mp4', '.mp3', '.ogg', '.wav', '.m4a', '.aac']

export const imageAcceptValue = [...allowedImageTypes, ...allowedImageExtensions].join(',')
export const maxImageUploadSize = 10 * 1024 * 1024
export const maxAudioUploadSize = 10 * 1024 * 1024

const mediaTypesByExtension = new Map([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
  ['gif', 'image/gif'],
  ['webm', 'audio/webm'],
  ['mp4', 'audio/mp4'],
  ['mp3', 'audio/mpeg'],
  ['ogg', 'audio/ogg'],
  ['wav', 'audio/wav'],
  ['m4a', 'audio/mp4'],
  ['aac', 'audio/aac'],
])

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes > 9 * 1024 * 1024 ? 0 : 1)} MB`
}

export function validateImageFile(file) {
  validateMediaFile(file, 'image')
}

export function validateMediaFile(file, restrictToType) {
  if (!file) {
    throw new Error('Choose a file first.')
  }

  const contentType = getMediaContentType(file)

  if (!contentType) {
    throw new Error('Unsupported file format.')
  }

  if (restrictToType === 'image' && !contentType.startsWith('image/')) {
    throw new Error('Use a JPEG, PNG, WebP, or GIF image.')
  }

  if (restrictToType === 'audio' && !contentType.startsWith('audio/')) {
    throw new Error('Use a supported audio format.')
  }

  const maxSize = contentType.startsWith('audio/') ? maxAudioUploadSize : maxImageUploadSize
  if (file.size > maxSize) {
    throw new Error(`Files must be ${formatFileSize(maxSize)} or smaller.`)
  }
}

export function getImageContentType(file) {
  return getMediaContentType(file)
}

export function getMediaContentType(file) {
  if (allowedImageTypes.includes(file?.type) || allowedAudioTypes.includes(file?.type)) {
    return file.type
  }

  const extension = String(file?.name ?? '').split('.').pop()?.toLowerCase()
  return mediaTypesByExtension.get(extension) ?? ''
}

function uploadWithProgress(uploadUrl, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', uploadUrl)
    request.setRequestHeader('Content-Type', contentType)

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== 'function') return
      onProgress(Math.round((event.loaded / event.total) * 100))
    }

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve()
        return
      }

      reject(new Error(`Image upload failed (${request.status}).`))
    }

    request.onerror = () => reject(new Error('Image upload failed.'))
    request.ontimeout = () => reject(new Error('Image upload timed out.'))
    request.timeout = 60000
    request.send(file)
  })
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function createUploadUrl(supabase, file, contentType) {
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

  return data
}

async function uploadMedia(supabase, file, restrictToType, onProgress) {
  validateMediaFile(file, restrictToType)
  const contentType = getMediaContentType(file)
  onProgress?.(1)

  let data
  try {
    data = await createUploadUrl(supabase, file, contentType)
  } catch {
    await wait(350)
    data = await createUploadUrl(supabase, file, contentType)
  }

  try {
    await uploadWithProgress(data.uploadUrl, file, contentType, onProgress)
  } catch {
    onProgress?.(1)
    await uploadWithProgress(data.uploadUrl, file, contentType, onProgress)
  }

  onProgress?.(100)

  return data.publicUrl
}

export async function uploadChatImage(supabase, file, onProgress) {
  const publicUrl = await uploadMedia(supabase, file, 'image', onProgress)

  return {
    mediaUrl: publicUrl,
    mediaType: 'image',
  }
}

export async function uploadChatAudio(supabase, file, onProgress) {
  const publicUrl = await uploadMedia(supabase, file, 'audio', onProgress)

  return {
    mediaUrl: publicUrl,
    mediaType: 'audio',
  }
}

export async function uploadProfileImage(supabase, file, onProgress) {
  return uploadMedia(supabase, file, 'image', onProgress)
}

export function messageHasMedia(message) {
  return Boolean(message?.media_url && (message?.media_type === 'image' || message?.media_type === 'gif' || message?.media_type === 'audio'))
}

export function mediaPreviewLabel(message) {
  if (!messageHasMedia(message)) return message?.body ?? ''
  if (message.media_type === 'audio') return 'Voice Message'
  const prefix = message.media_type === 'gif' ? 'GIF' : 'Image'
  return message.body ? `${prefix}: ${message.body}` : prefix
}
