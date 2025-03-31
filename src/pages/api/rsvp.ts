// src/pages/api/confirmacion.js
import type { APIRoute } from 'astro';
import { createClient } from "@supabase/supabase-js";
import { supabase } from '../../lib/supabaseClient';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    
    const data = {
      nombre: formData.get('nombre'),
      telefono: formData.get('telefono'),
      asistencia: formData.get('asistencia'),
      acompanantes: formData.get('acompanantes'),
      created_at: new Date().toISOString()
    };

    // Intenta con el cliente normal primero
    let { data: result, error } = await supabase
      .from('wedding_rsvp')
      .insert([data])
      .select();

    // Si falla por RLS, intenta con cliente de servicio
    if (error?.code === '42501') {
      const serviceSupabase = createClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        import.meta.env.PUBLIC_SUPABASE_SERVICE_KEY
      );
      
      ({ data: result, error } = await serviceSupabase
        .from('wedding_rsvp')
        .insert([data])
        .select());
    }

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data: result, redirectTo: '/api/gracias' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
   
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      details: error.details || 'Error al insertar registro',
      code: error.code
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  
};