import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_STATUSES = ['Backlog', 'In Progress', 'Review', 'Done'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High'];
const VALID_ASSIGNEES = ['Wayne', 'Mervbot'];

// Only these task columns may be changed through the API.
const UPDATABLE_FIELDS = [
  'title',
  'description',
  'status',
  'priority',
  'assignee',
  'due_date',
  'tags',
  'deliverable',
  'review_feedback',
  'blocked_reason',
  'sort_order',
];

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Compare secrets without leaking how many leading characters matched.
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < x.length; i++) {
    diff |= x[i] ^ (y[i % (y.length || 1)] ?? 0);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate using BOT_API_KEY
    const authHeader = req.headers.get('Authorization');
    const expectedToken = Deno.env.get('BOT_API_KEY');
    
    if (!expectedToken) {
      console.error('task-api: BOT_API_KEY is not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Server is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.slice('Bearer '.length);
    if (!safeEqual(token, expectedToken)) {
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
        if (body.status) {
          if (!VALID_STATUSES.includes(body.status)) {
            return json({ success: false, error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, 400);
          }
          query = query.eq('status', body.status);
        }
        if (body.assignee) {
          if (!VALID_ASSIGNEES.includes(body.assignee)) {
            return json({ success: false, error: `assignee must be one of: ${VALID_ASSIGNEES.join(', ')}` }, 400);
          }
          query = query.eq('assignee', body.assignee);
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

        const updates: Record<string, unknown> = {};
        for (const field of UPDATABLE_FIELDS) {
          if (data && Object.prototype.hasOwnProperty.call(data, field)) {
            updates[field] = data[field];
          }
        }
        if (Object.keys(updates).length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: `No updatable fields provided. Allowed: ${UPDATABLE_FIELDS.join(', ')}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Moving a task into Review starts a fresh review round.
        if (updates.status === 'Review' && !('review_feedback' in updates)) {
          updates.review_feedback = null;
        }

        const { data: task, error } = await supabase
          .from('tasks')
          .update(updates)
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

      // ===== SINGLE TASK + COMMENTS =====

      case 'get': {
        if (!id) return json({ success: false, error: 'id is required for get' }, 400);

        const { data: task, error } = await supabase
          .from('tasks')
          .select('*, project:projects(*)')
          .eq('id', id)
          .maybeSingle();
        if (error) return json({ success: false, error: error.message }, 400);
        if (!task) return json({ success: false, error: 'Task not found' }, 404);

        const { data: comments, error: commentsError } = await supabase
          .from('task_comments')
          .select('*')
          .eq('task_id', id)
          .order('created_at', { ascending: true });
        if (commentsError) return json({ success: false, error: commentsError.message }, 400);

        return json({ success: true, data: { ...task, comments } });
      }

      case 'list-comments': {
        if (!id) return json({ success: false, error: 'id (task id) is required for list-comments' }, 400);

        const { data: comments, error } = await supabase
          .from('task_comments')
          .select('*')
          .eq('task_id', id)
          .order('created_at', { ascending: true });
        if (error) return json({ success: false, error: error.message }, 400);

        return json({ success: true, data: comments });
      }

      case 'add-comment': {
        if (!id) return json({ success: false, error: 'id (task id) is required for add-comment' }, 400);
        const commentBody = typeof data?.body === 'string' ? data.body.trim() : '';
        if (!commentBody) return json({ success: false, error: 'data.body is required for add-comment' }, 400);
        const author = data?.author || 'Mervbot';
        if (!VALID_ASSIGNEES.includes(author)) {
          return json({ success: false, error: `author must be one of: ${VALID_ASSIGNEES.join(', ')}` }, 400);
        }

        const { data: comment, error } = await supabase
          .from('task_comments')
          .insert({ task_id: id, author, body: commentBody })
          .select('*')
          .single();
        if (error) return json({ success: false, error: error.message }, 400);

        console.log('Added comment to task:', id);
        return json({ success: true, data: comment });
      }

      // ===== PROJECT ACTIONS =====

      case 'list-projects': {
        const { data: projects, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('List projects error:', error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data: projects }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-project': {
        if (!data?.name) {
          return new Response(
            JSON.stringify({ success: false, error: 'name is required for create-project' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: project, error } = await supabase
          .from('projects')
          .insert({ name: data.name })
          .select('*')
          .single();

        if (error) {
          console.error('Create project error:', error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Created project:', project.id);
        return new Response(
          JSON.stringify({ success: true, data: project }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-project': {
        if (!id) {
          return new Response(
            JSON.stringify({ success: false, error: 'id is required for delete-project' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Delete project error:', error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Deleted project:', id);
        return new Response(
          JSON.stringify({ success: true, data: { id } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}. Valid actions: list, get, create, update, delete, list-comments, add-comment, list-projects, create-project, delete-project` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('task-api error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
