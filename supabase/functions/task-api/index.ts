import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_STATUSES = ['Backlog', 'In Progress', 'Review', 'Done'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High'];
const VALID_ASSIGNEES = ['Wayne', 'Mervbot'];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate using BOT_API_KEY
    const authHeader = req.headers.get('Authorization');
    const expectedToken = Deno.env.get('BOT_API_KEY');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== expectedToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.json();
    const { action, id, project_id, data } = body;

    console.log(`task-api: action=${action}, id=${id}, project_id=${project_id}`);

    switch (action) {
      case 'list': {
        let query = supabase.from('tasks').select('*, project:projects(*)');
        if (project_id) {
          query = query.eq('project_id', project_id);
        }
        const { data: tasks, error } = await query.order('created_at', { ascending: false });
        
        if (error) {
          console.error('List error:', error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ success: true, data: tasks }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        if (!data?.project_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'project_id is required for create' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!data?.title) {
          return new Response(
            JSON.stringify({ success: false, error: 'title is required for create' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate status
        if (data.status && !VALID_STATUSES.includes(data.status)) {
          return new Response(
            JSON.stringify({ success: false, error: `status must be one of: ${VALID_STATUSES.join(', ')}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate priority
        if (data.priority && !VALID_PRIORITIES.includes(data.priority)) {
          return new Response(
            JSON.stringify({ success: false, error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate assignee
        if (data.assignee && !VALID_ASSIGNEES.includes(data.assignee)) {
          return new Response(
            JSON.stringify({ success: false, error: `assignee must be one of: ${VALID_ASSIGNEES.join(', ')}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const taskData = {
          project_id: data.project_id,
          title: data.title,
          description: data.description || null,
          status: data.status || 'Backlog',
          priority: data.priority || 'Medium',
          assignee: data.assignee || 'Mervbot',
          due_date: data.due_date || null,
          tags: data.tags || null,
          deliverable: data.deliverable || null,
        };

        const { data: task, error } = await supabase
          .from('tasks')
          .insert(taskData)
          .select('*, project:projects(*)')
          .single();

        if (error) {
          console.error('Create error:', error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Created task:', task.id);
        return new Response(
          JSON.stringify({ success: true, data: task }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!id) {
          return new Response(
            JSON.stringify({ success: false, error: 'id is required for update' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate status if provided
        if (data?.status && !VALID_STATUSES.includes(data.status)) {
          return new Response(
            JSON.stringify({ success: false, error: `status must be one of: ${VALID_STATUSES.join(', ')}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate priority if provided
        if (data?.priority && !VALID_PRIORITIES.includes(data.priority)) {
          return new Response(
            JSON.stringify({ success: false, error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate assignee if provided
        if (data?.assignee && !VALID_ASSIGNEES.includes(data.assignee)) {
          return new Response(
            JSON.stringify({ success: false, error: `assignee must be one of: ${VALID_ASSIGNEES.join(', ')}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: task, error } = await supabase
          .from('tasks')
          .update(data)
          .eq('id', id)
          .select('*, project:projects(*)')
          .single();

        if (error) {
          console.error('Update error:', error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Updated task:', id);
        return new Response(
          JSON.stringify({ success: true, data: task }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!id) {
          return new Response(
            JSON.stringify({ success: false, error: 'id is required for delete' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Delete error:', error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Deleted task:', id);
        return new Response(
          JSON.stringify({ success: true, data: { id } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}. Valid actions: list, create, update, delete` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('task-api error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
