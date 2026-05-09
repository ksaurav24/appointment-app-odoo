type UploadOptions = {
  folder?: string
}

type CloudinaryUploadResponse = {
  secure_url?: string
  error?: { message?: string }
}

function requiredEnv(name: string): string {
  const value =
    name === "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"
      ? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      : name === "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET"
        ? process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
        : undefined
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export async function uploadImageToCloudinary(
  file: File,
  options?: UploadOptions
): Promise<string> {
  const cloudName = requiredEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME")
  const uploadPreset = requiredEnv("NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET")

  const form = new FormData()
  form.append("file", file)
  form.append("upload_preset", uploadPreset)
  if (options?.folder) {
    form.append("folder", options.folder)
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: form,
    }
  )

  const payload = (await response.json()) as CloudinaryUploadResponse
  if (!response.ok || !payload.secure_url) {
    throw new Error(
      payload.error?.message ?? "Cloudinary upload failed. Please retry."
    )
  }

  return payload.secure_url
}
