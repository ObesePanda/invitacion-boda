// src/pages/api/upload-photo.ts
import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabaseClient';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ 
        error: 'No se recibió ningún archivo' 
      }), { status: 400 });
    }
    
    // Validar tipo y tamaño
    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ 
        error: 'El archivo es demasiado grande (máx. 5MB)' 
      }), { status: 400 });
    }
    
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      return new Response(JSON.stringify({ 
        error: 'Solo se permiten imágenes JPG o PNG' 
      }), { status: 400 });
    }
    
    // Generar nombre único
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${file.name.split('.').pop()}`;
    const fileBuffer = await file.arrayBuffer();
    
    // Subir a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('wedding-photos')
      .upload(`guest-uploads/${fileName}`, fileBuffer, {
        contentType: file.type,
        upsert: false
      });
    
    if (uploadError) throw uploadError;
    
    // Guardar referencia en base de datos
    const photoUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/storage/v1/object/public/wedding-photos/${uploadData.path}`;
    
    const { error: dbError } = await supabase
      .from('wedding_photos')
      .insert({
        url: photoUrl,
        uploaded_at: new Date().toISOString(),
        approved: false // Moderación opcional
      });
    
    if (dbError) throw dbError;
    
    return new Response(JSON.stringify({ 
      success: true,
      path: uploadData.path,
      url: photoUrl
    }), { status: 200 });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.details 
    }), { status: 500 });
  }
};