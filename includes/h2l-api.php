<?php
/**
 * REST API - Frontend Veri Yönetimi (CRUD)
 * Güvenlik ve Erişim Kontrolleri ile Güncellendi.
 * Partial Update (Kısmi Güncelleme) desteği eklendi.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

add_action( 'rest_api_init', function () {
    // Başlangıç Verisi
    register_rest_route( 'h2l/v1', '/init', array(
        'methods' => 'GET',
        'callback' => 'h2l_api_get_init_data',
        'permission_callback' => function () { return is_user_logged_in(); }
    ) );

    // Görevler (GET, POST, DELETE)
    register_rest_route( 'h2l/v1', '/tasks(?:/(?P<id>\d+))?', array(
        array(
            'methods' => ['POST', 'DELETE'],
            'callback' => 'h2l_api_manage_task',
            'permission_callback' => function () { return is_user_logged_in(); }
        ),
        array(
            'methods' => 'GET',
            'callback' => 'h2l_api_get_tasks',
            'permission_callback' => function () { return is_user_logged_in(); }
        )
    ) );

    // Yorumlar
    register_rest_route( 'h2l/v1', '/comments(?:/(?P<id>\d+))?', array(
        'methods' => ['GET', 'POST', 'DELETE'],
        'callback' => 'h2l_api_manage_comments',
        'permission_callback' => function () { return is_user_logged_in(); }
    ) );

    // Projeler
    register_rest_route( 'h2l/v1', '/projects(?:/(?P<id>\d+))?', array(
        'methods' => ['POST', 'DELETE'],
        'callback' => 'h2l_api_manage_project',
        'permission_callback' => function () { return is_user_logged_in(); }
    ) );

    // Klasörler
    register_rest_route( 'h2l/v1', '/folders(?:/(?P<id>\d+))?', array(
        'methods' => ['POST', 'DELETE'],
        'callback' => 'h2l_api_manage_folder',
        'permission_callback' => function () { return is_user_logged_in(); }
    ) );

    // Bölümler (Sections)
    register_rest_route( 'h2l/v1', '/sections(?:/(?P<id>\d+))?', array(
        'methods' => ['POST', 'DELETE'],
        'callback' => 'h2l_api_manage_section',
        'permission_callback' => function () { return is_user_logged_in(); }
    ) );

    // YENİ: SIRALAMA (Reorder)
    register_rest_route( 'h2l/v1', '/reorder', array(
        'methods' => 'POST',
        'callback' => 'h2l_api_reorder_items',
        'permission_callback' => function () { return is_user_logged_in(); }
    ) );
});

function h2l_get_user_profile_picture_url( $user_id ) {
    $avatar_html = get_avatar( $user_id, 96 );
    if ( preg_match( '/src=["\']([^"\']+)["\']/', $avatar_html, $matches ) ) {
        return html_entity_decode( $matches[1] );
    }
    return get_avatar_url( $user_id );
}

function h2l_api_get_tasks($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'h2l_tasks';
    $params = $request->get_params();
    
    $where = "WHERE status != 'trash'"; 
    
    if (isset($params['status'])) {
        $where .= $wpdb->prepare(" AND status = %s", sanitize_text_field($params['status']));
    }
    
    if (isset($params['project_id'])) {
        $where .= $wpdb->prepare(" AND project_id = %d", intval($params['project_id']));
    }

    $sql = "SELECT t.*, 
            (SELECT title FROM {$wpdb->prefix}h2l_projects WHERE id = t.project_id) as project_name,
            (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_comments c WHERE c.task_id = t.id) as comment_count
            FROM $table t $where ORDER BY t.created_at DESC";
            
    $tasks = $wpdb->get_results($sql);

    if (!empty($tasks)) {
        $task_ids = array_column($tasks, 'id');
        $task_labels_map = [];
        
        if (!empty($task_ids)) {
            $ids_placeholder = implode(',', array_fill(0, count($task_ids), '%d'));
            $labels_query = $wpdb->prepare("
                SELECT tl.task_id, l.* FROM {$wpdb->prefix}h2l_task_labels tl
                JOIN {$wpdb->prefix}h2l_labels l ON tl.label_id = l.id
                WHERE tl.task_id IN ($ids_placeholder)
            ", $task_ids);
            
            $labels_results = $wpdb->get_results($labels_query);
            
            foreach ($labels_results as $lr) {
                $task_labels_map[$lr->task_id][] = [
                    'id' => $lr->id,
                    'name' => $lr->name,
                    'color' => $lr->color,
                    'slug' => $lr->slug
                ];
            }
        }

        foreach ($tasks as $task) {
            $task->labels = isset($task_labels_map[$task->id]) ? $task_labels_map[$task->id] : [];
            $task->assignees = !empty($task->assignee_ids) ? json_decode((string)$task->assignee_ids) : [];
            
            if($task->due_date) {
                $ts = strtotime($task->due_date);
                $task->date_display = (date('Y-m-d') == date('Y-m-d', $ts)) ? 'Bugün' : date_i18n('j M', $ts);
            } else { 
                $task->date_display = ''; 
            }
        }
    }
    
    return rest_ensure_response($tasks);
}

function h2l_api_get_init_data( $request ) {
    global $wpdb;
    $uid = get_current_user_id();
    
    $folders = $wpdb->get_results($wpdb->prepare("
        SELECT * FROM {$wpdb->prefix}h2l_folders 
        WHERE access_type = 'public' OR owner_id = %d 
        ORDER BY name ASC
    ", $uid));
    
    $all_projects = $wpdb->get_results("
        SELECT p.*, 
        (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_tasks WHERE project_id = p.id AND status = 'completed') as completed_count,
        (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_tasks WHERE project_id = p.id AND status != 'trash') as total_count
        FROM {$wpdb->prefix}h2l_projects p 
        WHERE status != 'trash' 
        ORDER BY title ASC
    ");

    $visible_projects = [];
    $visible_project_ids = [];

    foreach ($all_projects as $p) {
        $managers = !empty($p->managers) ? json_decode((string)$p->managers, true) : [];
        if (!is_array($managers)) $managers = [];

        if ( $p->owner_id == $uid || in_array((string)$uid, $managers) || in_array($uid, $managers) ) {
            $p->managers = $managers;
            $visible_projects[] = $p;
            $visible_project_ids[] = $p->id;
        }
    }

    $tasks = [];
    if (!empty($visible_project_ids)) {
        $ids_placeholder = implode(',', array_fill(0, count($visible_project_ids), '%d'));
        
        $tasks = $wpdb->get_results($wpdb->prepare(
            "SELECT t.*, 
            (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_comments c WHERE c.task_id = t.id) as comment_count
            FROM {$wpdb->prefix}h2l_tasks t 
            WHERE status != 'trash' 
            AND project_id IN ($ids_placeholder) 
            ORDER BY sort_order ASC, created_at ASC",
            $visible_project_ids
        ));
        
        $task_ids = array_column($tasks, 'id');
        $task_labels_map = [];
        
        if (!empty($task_ids)) {
            $t_ids_placeholder = implode(',', array_fill(0, count($task_ids), '%d'));
            $labels_query = $wpdb->prepare("
                SELECT tl.task_id, l.* FROM {$wpdb->prefix}h2l_task_labels tl
                JOIN {$wpdb->prefix}h2l_labels l ON tl.label_id = l.id
                WHERE tl.task_id IN ($t_ids_placeholder)
            ", $task_ids);
            
            $labels_results = $wpdb->get_results($labels_query);
            
            foreach ($labels_results as $lr) {
                $task_labels_map[$lr->task_id][] = [
                    'id' => $lr->id,
                    'name' => $lr->name,
                    'color' => $lr->color,
                    'slug' => $lr->slug
                ];
            }
        }
        
        $tasks = array_map(function($t) use ($task_labels_map) {
            $t->assignees = !empty($t->assignee_ids) ? json_decode((string)$t->assignee_ids) : [];
            $t->labels = isset($task_labels_map[$t->id]) ? $task_labels_map[$t->id] : [];
            
            if($t->due_date) {
                $ts = strtotime($t->due_date);
                $t->date_display = (date('Y-m-d') == date('Y-m-d', $ts)) ? 'Bugün' : date_i18n('j M', $ts);
            } else { $t->date_display = ''; }
            return $t;
        }, $tasks);
    }

    $sections = [];
    if (!empty($visible_project_ids)) {
        $ids_placeholder = implode(',', array_fill(0, count($visible_project_ids), '%d'));
        $sections = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}h2l_sections 
            WHERE project_id IN ($ids_placeholder) 
            ORDER BY sort_order ASC",
            $visible_project_ids
        ));
    }
    $labels = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}h2l_labels ORDER BY name ASC");

    $users = array_map(function($u) {
        return [
            'id' => $u->ID, 
            'name' => $u->display_name, 
            'avatar' => h2l_get_user_profile_picture_url($u->ID)
        ];
    }, get_users());

    return rest_ensure_response( array(
        'folders' => $folders, 
        'projects' => $visible_projects, 
        'sections' => $sections, 
        'tasks' => $tasks, 
        'users' => $users, 
        'labels' => $labels,
        'uid' => $uid
    ) );
}

function h2l_api_reorder_items($request) {
    global $wpdb;
    $params = $request->get_json_params();
    $type = isset($params['type']) ? $params['type'] : 'task';
    $items = isset($params['items']) ? $params['items'] : [];

    if (empty($items)) return ['success' => false];

    if ($type === 'task') {
        $table = $wpdb->prefix . 'h2l_tasks';
        foreach ($items as $item) {
            $update_data = ['sort_order' => intval($item['order'])];
            if (isset($item['section_id'])) {
                $update_data['section_id'] = intval($item['section_id']);
            }
            $wpdb->update($table, $update_data, ['id' => intval($item['id'])]);
        }
    } elseif ($type === 'section') {
        $table = $wpdb->prefix . 'h2l_sections';
        foreach ($items as $item) {
            $wpdb->update($table, ['sort_order' => intval($item['order'])], ['id' => intval($item['id'])]);
        }
    }

    return ['success' => true];
}

function h2l_api_manage_task($request) {
    global $wpdb; 
    $table = $wpdb->prefix . 'h2l_tasks';
    $table_task_labels = $wpdb->prefix . 'h2l_task_labels';
    $table_labels = $wpdb->prefix . 'h2l_labels';

    $method = $request->get_method(); 
    $id = $request->get_param('id'); 
    $params = $request->get_json_params();
    
    if ($method === 'DELETE') { 
        $wpdb->update($table, ['status' => 'trash'], ['id' => $id]); 
        return ['success' => true]; 
    }
    
    if ($id) {
        $data = [];
        if (isset($params['title'])) $data['title'] = wp_kses_post($params['title']);
        if (isset($params['content'])) $data['content'] = wp_kses_post($params['content']);
        if (isset($params['projectId'])) $data['project_id'] = intval($params['projectId']);
        if (isset($params['sectionId'])) $data['section_id'] = intval($params['sectionId']);
        if (isset($params['priority'])) $data['priority'] = intval($params['priority']);
        if (isset($params['status'])) $data['status'] = sanitize_text_field($params['status']);
        if (isset($params['location'])) $data['location'] = sanitize_text_field($params['location']);
        if (array_key_exists('dueDate', $params)) {
            $data['due_date'] = !empty($params['dueDate']) ? sanitize_text_field($params['dueDate']) : null;
        }
        if (isset($params['assignees'])) $data['assignee_ids'] = json_encode($params['assignees']);
        if (isset($params['sortOrder'])) $data['sort_order'] = intval($params['sortOrder']);
        
        if (!empty($data)) {
            $wpdb->update($table, $data, ['id'=>$id]);
        }
        $new_id = $id;

    } else {
        $project_id = intval($params['projectId'] ?? 0);
        $max_sort = $wpdb->get_var($wpdb->prepare("SELECT MAX(sort_order) FROM $table WHERE project_id = %d", $project_id));
        
        $data = [
            'title' => wp_kses_post($params['title'] ?? ''), 
            'content' => wp_kses_post($params['content'] ?? ''),
            'project_id' => $project_id,
            'section_id' => intval($params['sectionId'] ?? 0),
            'priority' => intval($params['priority'] ?? 4),
            'status' => sanitize_text_field($params['status'] ?? 'open'),
            'due_date' => !empty($params['dueDate']) ? sanitize_text_field($params['dueDate']) : null,
            'assignee_ids' => json_encode($params['assignees'] ?? []),
            'created_at' => current_time('mysql'),
            'sort_order' => $max_sort ? $max_sort + 1 : 0
        ];
        
        $wpdb->insert($table, $data); 
        $new_id = $wpdb->insert_id; 
    }
    if (isset($params['labels']) && is_array($params['labels'])) {
        if (count($params['labels']) > 3) {
            $params['labels'] = array_slice($params['labels'], 0, 3);
        }
        $wpdb->delete($table_task_labels, ['task_id' => $new_id]);
        foreach ($params['labels'] as $label_name) {
            $label_name = sanitize_text_field($label_name);
            $label_id = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table_labels WHERE name = %s", $label_name));
            if (!$label_id) {
                $wpdb->insert($table_labels, ['name' => $label_name, 'slug' => sanitize_title($label_name), 'color' => '#808080']);
                $label_id = $wpdb->insert_id;
            }
            $wpdb->insert($table_task_labels, ['task_id' => $new_id, 'label_id' => $label_id]);
        }
    }
    $task = $wpdb->get_row($wpdb->prepare(
        "SELECT t.*, 
        (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_comments c WHERE c.task_id = t.id) as comment_count 
        FROM $table t WHERE id=%d", 
        $new_id
    ));

    $task->labels = $wpdb->get_results($wpdb->prepare("
        SELECT l.* FROM {$wpdb->prefix}h2l_task_labels tl
        JOIN {$wpdb->prefix}h2l_labels l ON tl.label_id = l.id
        WHERE tl.task_id = %d
    ", $new_id));

    $task->assignees = !empty($task->assignee_ids) ? json_decode((string)$task->assignee_ids) : [];
    
    if($task->due_date) {
        $ts = strtotime($task->due_date);
        $task->date_display = (date('Y-m-d') == date('Y-m-d', $ts)) ? 'Bugün' : date_i18n('j M', $ts);
    } else { 
        $task->date_display = ''; 
    }

    return $task;
}

function h2l_api_manage_comments($request) {
    $method = $request->get_method();
    $id = $request->get_param('id'); 
    $comment_cls = new H2L_Comment();

    if ($method === 'GET') {
        $task_id = $request->get_param('task_id');
        if (!$task_id) return new WP_Error('no_task', 'Task ID required', ['status'=>400]);
        return rest_ensure_response( $comment_cls->get_by_task($task_id) );
    }

    if ($method === 'POST') {
        $params = $request->get_json_params();
        
        // YENİ: Yorum Güncelleme (Eğer ID varsa)
        if ( $id ) {
            $comment = $comment_cls->get($id);
            if(!$comment || $comment->user_id != get_current_user_id()) {
                return new WP_Error('forbidden', 'Yetkisiz işlem', ['status'=>403]);
            }
            
            if(empty($params['content'])) return new WP_Error('invalid_data', 'İçerik boş olamaz', ['status'=>400]);
            
            $updated_comment = $comment_cls->update($id, $params['content']);
            return rest_ensure_response($updated_comment);
        } 
        // Yeni Yorum Ekleme
        else {
            if(empty($params['task_id']) || empty($params['content'])) return new WP_Error('invalid_data', 'Missing data', ['status'=>400]);
            $comment = $comment_cls->add($params['task_id'], $params['content']);
            return rest_ensure_response($comment);
        }
    }

    if ($method === 'DELETE') {
        $id = $request->get_param('id');
        $comment = $comment_cls->get($id);
        if(!$comment || $comment->user_id != get_current_user_id()) {
            return new WP_Error('forbidden', 'Yetkisiz işlem', ['status'=>403]);
        }
        $comment_cls->delete($id);
        return ['success' => true];
    }
}

function h2l_api_manage_project($request) {
    global $wpdb; 
    $table_projects = $wpdb->prefix . 'h2l_projects';
    $table_folders = $wpdb->prefix . 'h2l_folders';
    $method = $request->get_method(); 
    $id = $request->get_param('id'); 
    $params = $request->get_json_params();
    $current_user_id = get_current_user_id();

    if ($method === 'DELETE') { 
        $project = $wpdb->get_row($wpdb->prepare("SELECT owner_id FROM $table_projects WHERE id = %d", $id));
        if ($project && $project->owner_id != $current_user_id) {
             return new WP_Error('forbidden', 'Sadece proje sahibi silebilir.', ['status'=>403]);
        }
        $wpdb->update($table_projects, ['status' => 'trash'], ['id' => $id]); 
        return ['success' => true]; 
    }

    if ($id) { 
        $data = [];
        if (isset($params['title'])) $data['title'] = sanitize_text_field($params['title']);
        if (isset($params['folderId'])) $data['folder_id'] = intval($params['folderId']);
        if (isset($params['color'])) $data['color'] = sanitize_hex_color($params['color']);
        if (isset($params['viewType'])) $data['view_type'] = sanitize_text_field($params['viewType']);
        if (isset($params['managers'])) {
            $managers = $params['managers'];
            if (isset($params['folderId'])) {
                $folder = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_folders WHERE id = %d", $params['folderId']));
                if ($folder && $folder->access_type === 'private') {
                    $managers = [];
                }
            }
            $clean_managers = array_map('strval', $managers);
            $data['managers'] = json_encode($clean_managers);
        }
        if (isset($params['is_favorite'])) $data['is_favorite'] = !empty($params['is_favorite']) ? 1 : 0;
        
        if (!empty($data)) {
            $wpdb->update($table_projects, $data, ['id' => $id]); 
        }
        $new_id = $id; 
    } else { 
        $folder_id = intval($params['folderId'] ?? 0);
        $managers = $params['managers'] ?? [];
        if ($folder_id > 0) {
            $folder = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_folders WHERE id = %d", $folder_id));
            if ($folder && $folder->access_type === 'private') $managers = [];
        }
        $clean_managers = array_map('strval', $managers);

        $data = [
            'title' => sanitize_text_field($params['title'] ?? ''),
            'folder_id' => $folder_id,
            'color' => sanitize_hex_color($params['color'] ?? '#808080'),
            'view_type' => sanitize_text_field($params['viewType'] ?? 'list'),
            'managers' => json_encode($clean_managers),
            'is_favorite' => !empty($params['is_favorite']) ? 1 : 0,
            'owner_id' => $current_user_id,
            'created_at' => current_time('mysql'),
            'status' => 'active'
        ];
        
        $wpdb->insert($table_projects, $data); 
        $new_id = $wpdb->insert_id; 
    }
    
    return $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_projects WHERE id=%d", $new_id));
}

function h2l_api_manage_folder($request) {
    global $wpdb; $table = $wpdb->prefix . 'h2l_folders';
    $method = $request->get_method(); $id = $request->get_param('id'); $params = $request->get_json_params();
    
    if ($method === 'DELETE') { $wpdb->delete($table, ['id' => $id]); return ['success' => true]; }
    
    if ($id) {
        $data = [];
        if(isset($params['name'])) $data['name'] = sanitize_text_field($params['name']);
        if(isset($params['access_type'])) $data['access_type'] = sanitize_text_field($params['access_type']);
        if(isset($params['description'])) $data['description'] = sanitize_textarea_field($params['description']);
        if(!empty($data)) $wpdb->update($table, $data, ['id'=>$id]);
        $new_id=$id;
    } else {
        $data = ['name'=>sanitize_text_field($params['name']??''),'access_type'=>sanitize_text_field($params['access_type']??'private'),'description'=>sanitize_textarea_field($params['description']??''),'owner_id'=>get_current_user_id()];
        $wpdb->insert($table, $data); 
        $new_id=$wpdb->insert_id;
    }
    return $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id=%d", $new_id));
}

function h2l_api_manage_section($request) {
    global $wpdb; $table = $wpdb->prefix . 'h2l_sections';
    $method = $request->get_method(); $id = $request->get_param('id'); $params = $request->get_json_params();
    
    if ($method === 'DELETE') { $wpdb->delete($table, ['id' => $id]); return ['success' => true]; }
    
    if ($id) {
        $data = [];
        if(isset($params['name'])) $data['name'] = sanitize_text_field($params['name']);
        if(isset($params['projectId'])) $data['project_id'] = intval($params['projectId']);
        if(isset($params['sortOrder'])) $data['sort_order'] = intval($params['sortOrder']);
        if(!empty($data)) $wpdb->update($table, $data, ['id' => $id]); 
        $new_id = $id;
    } else {
        $data = ['name' => sanitize_text_field($params['name']??''), 'project_id' => intval($params['projectId']??0), 'sort_order' => intval($params['sortOrder'] ?? 0), 'created_at' => current_time('mysql')];
        $wpdb->insert($table, $data); 
        $new_id = $wpdb->insert_id;
    }
    return $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $new_id));
}
?>