<?php
/**
 * REST API - Frontend Veri Yönetimi (CRUD)
 * GÜNCELLEME: Kişisel Favoriler Tablosu Entegrasyonu
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

function h2l_set_nocache_headers() {
    if ( ! headers_sent() ) {
        header( 'X-LiteSpeed-Cache-Control: no-cache' );
        header( 'Cache-Control: no-cache, no-store, must-revalidate, max-age=0' );
        header( 'Pragma: no-cache' );
        header( 'Expires: 0' );
    }
}

add_action( 'rest_api_init', function () {
    register_rest_route( 'h2l/v1', '/init', array('methods' => 'GET', 'callback' => 'h2l_api_get_init_data', 'permission_callback' => function () { return is_user_logged_in(); }) );
    register_rest_route( 'h2l/v1', '/tasks(?:/(?P<id>\d+))?', array(
        array('methods' => ['POST', 'DELETE'], 'callback' => 'h2l_api_manage_task', 'permission_callback' => function () { return is_user_logged_in(); }),
        array('methods' => 'GET', 'callback' => 'h2l_api_get_tasks', 'permission_callback' => function () { return is_user_logged_in(); })
    ) );
    register_rest_route( 'h2l/v1', '/comments(?:/(?P<id>\d+))?', array('methods' => ['GET', 'POST', 'DELETE'], 'callback' => 'h2l_api_manage_comments', 'permission_callback' => function () { return is_user_logged_in(); }) );
    register_rest_route( 'h2l/v1', '/projects(?:/(?P<id>\d+))?', array('methods' => ['POST', 'DELETE'], 'callback' => 'h2l_api_manage_project', 'permission_callback' => function () { return is_user_logged_in(); }) );
    register_rest_route( 'h2l/v1', '/folders(?:/(?P<id>\d+))?', array('methods' => ['POST', 'DELETE'], 'callback' => 'h2l_api_manage_folder', 'permission_callback' => function () { return is_user_logged_in(); }) );
    register_rest_route( 'h2l/v1', '/sections(?:/(?P<id>\d+))?', array('methods' => ['POST', 'DELETE'], 'callback' => 'h2l_api_manage_section', 'permission_callback' => function () { return is_user_logged_in(); }) );
    register_rest_route( 'h2l/v1', '/reorder', array('methods' => 'POST', 'callback' => 'h2l_api_reorder_items', 'permission_callback' => function () { return is_user_logged_in(); }) );
    register_rest_route( 'h2l/v1', '/trigger-reminders', array('methods' => 'POST', 'callback' => 'h2l_api_trigger_reminders', 'permission_callback' => function () { return is_user_logged_in(); }) );
    register_rest_route( 'h2l/v1', '/notifications', array(array('methods' => 'GET', 'callback' => 'h2l_api_get_notifications', 'permission_callback' => function () { return is_user_logged_in(); })) );
    register_rest_route( 'h2l/v1', '/notifications/read', array(array('methods' => 'POST', 'callback' => 'h2l_api_read_notifications', 'permission_callback' => function () { return is_user_logged_in(); })) );
});

function h2l_api_get_notifications() {
    h2l_set_nocache_headers();
    if ( ! class_exists('H2L_Notification') ) return [];
    $user_id = get_current_user_id();
    $notify = new H2L_Notification();
    return rest_ensure_response([
        'list' => $notify->get_notifications($user_id),
        'unread_count' => $notify->get_unread_count($user_id)
    ]);
}

function h2l_api_read_notifications($request) {
    if ( ! class_exists('H2L_Notification') ) return [];
    $notify = new H2L_Notification();
    $params = $request->get_json_params();
    if ( isset($params['all']) && $params['all'] ) { $notify->mark_all_read(get_current_user_id()); } 
    elseif ( isset($params['id']) ) { $notify->mark_as_read(intval($params['id'])); }
    return h2l_api_get_notifications();
}

function h2l_api_trigger_reminders() {
    if ( class_exists( 'H2L_Reminder' ) ) {
        $reminder = new H2L_Reminder();
        $reminder->process_queue();
        return rest_ensure_response(['success' => true, 'message' => 'Reminder check triggered']);
    }
    return rest_ensure_response(['success' => false]);
}

function h2l_get_user_profile_picture_url( $user_id ) {
    $avatar_html = get_avatar( $user_id, 96 );
    if ( preg_match( '/src=["\']([^"\']+)["\']/', $avatar_html, $matches ) ) { return html_entity_decode( $matches[1] ); }
    return get_avatar_url( $user_id );
}

function h2l_api_get_tasks($request) {
    h2l_set_nocache_headers(); 
    global $wpdb;
    $table = $wpdb->prefix . 'h2l_tasks';
    $params = $request->get_params();
    $where = "WHERE status != 'trash'"; 
    if (isset($params['status'])) { $where .= $wpdb->prepare(" AND status = %s", sanitize_text_field((string)$params['status'])); }
    if (isset($params['project_id'])) { $where .= $wpdb->prepare(" AND project_id = %d", intval($params['project_id'])); }
    $sql = "SELECT t.*, (SELECT title FROM {$wpdb->prefix}h2l_projects WHERE id = t.project_id) as project_name, (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_comments c WHERE c.task_id = t.id) as comment_count FROM $table t $where ORDER BY t.created_at DESC";
    $tasks = $wpdb->get_results($sql);
    
    if (!empty($tasks)) {
        $task_ids = array_column($tasks, 'id');
        $task_labels_map = [];
        if (!empty($task_ids)) {
            $ids_placeholder = implode(',', array_fill(0, count($task_ids), '%d'));
            $labels_query = $wpdb->prepare("SELECT tl.task_id, l.* FROM {$wpdb->prefix}h2l_task_labels tl JOIN {$wpdb->prefix}h2l_labels l ON tl.label_id = l.id WHERE tl.task_id IN ($ids_placeholder)", $task_ids);
            $labels_results = $wpdb->get_results($labels_query);
            foreach ($labels_results as $lr) { $task_labels_map[$lr->task_id][] = ['id' => $lr->id, 'name' => $lr->name, 'color' => $lr->color, 'slug' => $lr->slug]; }
        }
        foreach ($tasks as $task) {
            $task->labels = isset($task_labels_map[$task->id]) ? $task_labels_map[$task->id] : [];
            $task->assignees = !empty($task->assignee_ids) ? json_decode((string)$task->assignee_ids) : [];
            if($task->due_date) { $ts = strtotime($task->due_date); $task->date_display = (date('Y-m-d') == date('Y-m-d', $ts)) ? 'Bugün' : date_i18n('j M', $ts); } else { $task->date_display = ''; }
        }
    }
    return rest_ensure_response($tasks);
}

function h2l_api_get_init_data( $request ) {
    h2l_set_nocache_headers();
    global $wpdb;
    $uid = get_current_user_id();

    // 1. Folders
    $sql_folders = "SELECT * FROM {$wpdb->prefix}h2l_folders 
                    WHERE (slug != 'inbox' AND slug != 'notlarim') 
                    OR owner_id = %d 
                    ORDER BY name ASC";
    $folders = $wpdb->get_results($wpdb->prepare($sql_folders, $uid));

    // 2. Projects
    $sql_projects = "SELECT p.*, 
                    (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_tasks WHERE project_id = p.id AND status = 'completed') as completed_count, 
                    (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_tasks WHERE project_id = p.id AND status != 'trash') as total_count 
                    FROM {$wpdb->prefix}h2l_projects p 
                    WHERE p.status != 'trash' 
                    AND ( (p.slug != 'inbox-project' AND p.slug != 'notlarim') OR p.owner_id = %d )
                    ORDER BY p.title ASC";
    
    $all_projects = $wpdb->get_results($wpdb->prepare($sql_projects, $uid));
    
    // GÜNCELLEME: Kişisel favori ID'lerini çek
    $fav_ids = $wpdb->get_col($wpdb->prepare("SELECT project_id FROM {$wpdb->prefix}h2l_user_favorites WHERE user_id = %d", $uid));
    
    $visible_projects = [];
    $member_project_ids = []; 

    foreach ($all_projects as $p) {
        $managers = !empty($p->managers) ? json_decode((string)$p->managers, true) : [];
        if (!is_array($managers)) $managers = [];
        
        $is_owner = ($p->owner_id == $uid);
        $is_manager = in_array((string)$uid, $managers) || in_array($uid, $managers);
        
        $p->is_member = ($is_owner || $is_manager);
        $p->managers = $managers;
        
        // GÜNCELLEME: Favori durumunu kişiye özel ayarla
        $p->is_favorite = in_array($p->id, $fav_ids);
        
        $visible_projects[] = $p;
        
        if ($p->is_member) {
            $member_project_ids[] = $p->id;
        }
    }

    // 3. Tasks
    $tasks = [];
    if (!empty($member_project_ids)) {
        $ids_placeholder = implode(',', array_fill(0, count($member_project_ids), '%d'));
        $tasks = $wpdb->get_results($wpdb->prepare(
            "SELECT t.*, (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_comments c WHERE c.task_id = t.id) as comment_count 
             FROM {$wpdb->prefix}h2l_tasks t 
             WHERE status != 'trash' AND project_id IN ($ids_placeholder) 
             ORDER BY sort_order ASC, created_at ASC", 
            $member_project_ids
        ));

        $task_ids = array_column($tasks, 'id');
        $task_labels_map = [];
        if (!empty($task_ids)) {
            $t_ids_placeholder = implode(',', array_fill(0, count($task_ids), '%d'));
            $labels_query = $wpdb->prepare("SELECT tl.task_id, l.* FROM {$wpdb->prefix}h2l_task_labels tl JOIN {$wpdb->prefix}h2l_labels l ON tl.label_id = l.id WHERE tl.task_id IN ($t_ids_placeholder)", $task_ids);
            $labels_results = $wpdb->get_results($labels_query);
            foreach ($labels_results as $lr) { $task_labels_map[$lr->task_id][] = ['id' => $lr->id, 'name' => $lr->name, 'color' => $lr->color, 'slug' => $lr->slug]; }
        }
        $tasks = array_map(function($t) use ($task_labels_map) {
            $t->assignees = !empty($t->assignee_ids) ? json_decode((string)$t->assignee_ids) : [];
            $t->labels = isset($task_labels_map[$t->id]) ? $task_labels_map[$t->id] : [];
            if($t->due_date) { $ts = strtotime($t->due_date); $t->date_display = (date('Y-m-d') == date('Y-m-d', $ts)) ? 'Bugün' : date_i18n('j M', $ts); } else { $t->date_display = ''; }
            return $t;
        }, $tasks);
    }

    // 4. Sections
    $sections = [];
    if (!empty($member_project_ids)) {
        $ids_placeholder = implode(',', array_fill(0, count($member_project_ids), '%d'));
        $sections = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}h2l_sections WHERE project_id IN ($ids_placeholder) ORDER BY sort_order ASC", $member_project_ids));
    }

    $labels = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}h2l_labels ORDER BY name ASC");
    $users = array_map(function($u) { 
        return [
            'id' => $u->ID, 
            'name' => $u->display_name, 
            'username' => $u->user_login, 
            'avatar' => h2l_get_user_profile_picture_url($u->ID)
        ]; 
    }, get_users());

    return rest_ensure_response( array('folders' => $folders, 'projects' => $visible_projects, 'sections' => $sections, 'tasks' => $tasks, 'users' => $users, 'labels' => $labels, 'uid' => $uid) );
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
            if (isset($item['section_id'])) { $update_data['section_id'] = intval($item['section_id']); }
            $wpdb->update($table, $update_data, ['id' => intval($item['id'])]);
        }
    } elseif ($type === 'section') {
        $table = $wpdb->prefix . 'h2l_sections';
        foreach ($items as $item) { $wpdb->update($table, ['sort_order' => intval($item['order'])], ['id' => intval($item['id'])]); }
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
    
    if ($method === 'DELETE') { $wpdb->update($table, ['status' => 'trash'], ['id' => $id]); return ['success' => true]; }
    
    $new_assignees_for_notify = []; 

    if ($id) {
        $old_assignees_json = $wpdb->get_var($wpdb->prepare("SELECT assignee_ids FROM $table WHERE id = %d", $id));
        $old_assignees = !empty($old_assignees_json) ? json_decode($old_assignees_json) : [];
        if(!is_array($old_assignees)) $old_assignees = [];

        $data = [];
        if (isset($params['title'])) $data['title'] = wp_kses_post((string)$params['title']);
        if (isset($params['content'])) $data['content'] = wp_kses_post((string)$params['content']);
        if (isset($params['projectId'])) $data['project_id'] = intval($params['projectId']);
        if (isset($params['sectionId'])) $data['section_id'] = intval($params['sectionId']);
        if (isset($params['priority'])) $data['priority'] = intval($params['priority']);
        if (isset($params['status'])) $data['status'] = sanitize_text_field((string)$params['status']);
        if (isset($params['location'])) $data['location'] = sanitize_text_field((string)$params['location']);
        
        if (isset($params['reminder_enabled'])) {
            $data['reminder_enabled'] = $params['reminder_enabled'] ? 1 : 0;
            if ($data['reminder_enabled'] === 1) $data['reminder_sent'] = 0;
        }
        if (array_key_exists('dueDate', $params)) {
            $new_due = !empty($params['dueDate']) ? sanitize_text_field((string)$params['dueDate']) : null;
            $data['due_date'] = $new_due;
            $old_due = $wpdb->get_var($wpdb->prepare("SELECT due_date FROM $table WHERE id = %d", $id));
            if ($new_due !== $old_due) $data['reminder_sent'] = 0;
        }
        
        if (isset($params['assignees'])) {
            $data['assignee_ids'] = json_encode($params['assignees']);
            $new_assignees_for_notify = array_diff($params['assignees'], $old_assignees);
        }

        if (isset($params['sortOrder'])) $data['sort_order'] = intval($params['sortOrder']);
        
        if (!empty($data)) { $wpdb->update($table, $data, ['id'=>$id]); }
        $new_id = $id;

    } else {
        $project_id = intval($params['projectId'] ?? 0);
        $max_sort = $wpdb->get_var($wpdb->prepare("SELECT MAX(sort_order) FROM $table WHERE project_id = %d", $project_id));
        
        $assignees = isset($params['assignees']) ? $params['assignees'] : [];
        $new_assignees_for_notify = $assignees; 

        $data = [
            'title' => wp_kses_post((string)($params['title'] ?? '')), 
            'content' => wp_kses_post((string)($params['content'] ?? '')),
            'project_id' => $project_id, 'section_id' => intval($params['sectionId'] ?? 0),
            'priority' => intval($params['priority'] ?? 4), 'status' => sanitize_text_field((string)($params['status'] ?? 'open')),
            'due_date' => !empty($params['dueDate']) ? sanitize_text_field((string)$params['dueDate']) : null,
            'assignee_ids' => json_encode($assignees),
            'reminder_enabled' => 0, 
            'reminder_sent' => 0, 'created_at' => current_time('mysql'),
            'sort_order' => $max_sort ? $max_sort + 1 : 0
        ];
        $wpdb->insert($table, $data); 
        $new_id = $wpdb->insert_id; 
    }

    if ( !empty($new_assignees_for_notify) && class_exists('H2L_Reminder') ) {
        $reminder = new H2L_Reminder();
        $reminder->send_assignment_notification($new_id, $new_assignees_for_notify);
    }

    if (isset($params['labels']) && is_array($params['labels'])) {
        if (count($params['labels']) > 3) { $params['labels'] = array_slice($params['labels'], 0, 3); }
        $wpdb->delete($table_task_labels, ['task_id' => $new_id]);
        foreach ($params['labels'] as $label_name) {
            $label_name = sanitize_text_field((string)$label_name);
            $label_id = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table_labels WHERE name = %s", $label_name));
            if (!$label_id) { $wpdb->insert($table_labels, ['name' => $label_name, 'slug' => sanitize_title($label_name), 'color' => '#808080']); $label_id = $wpdb->insert_id; }
            $wpdb->insert($table_task_labels, ['task_id' => $new_id, 'label_id' => $label_id]);
        }
    }

    $task = $wpdb->get_row($wpdb->prepare("SELECT t.*, (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_comments c WHERE c.task_id = t.id) as comment_count FROM $table t WHERE id=%d", $new_id));
    $task->labels = $wpdb->get_results($wpdb->prepare("SELECT l.* FROM {$wpdb->prefix}h2l_task_labels tl JOIN {$wpdb->prefix}h2l_labels l ON tl.label_id = l.id WHERE tl.task_id = %d", $new_id));
    $task->assignees = !empty($task->assignee_ids) ? json_decode((string)$task->assignee_ids) : [];
    if($task->due_date) { $ts = strtotime($task->due_date); $task->date_display = (date('Y-m-d') == date('Y-m-d', $ts)) ? 'Bugün' : date_i18n('j M', $ts); } else { $task->date_display = ''; }
    return $task;
}

function h2l_api_manage_comments($request) {
    h2l_set_nocache_headers();
    $method = $request->get_method(); $id = $request->get_param('id'); $comment_cls = new H2L_Comment();
    if ($method === 'GET') {
        $task_id = $request->get_param('task_id');
        if (!$task_id) return new WP_Error('no_task', 'Task ID required', ['status'=>400]);
        return rest_ensure_response( $comment_cls->get_by_task($task_id) );
    }
    if ($method === 'POST') {
        $params = $request->get_json_params();
        if ( $id ) {
            $comment = $comment_cls->get($id);
            if(!$comment || $comment->user_id != get_current_user_id()) { return new WP_Error('forbidden', 'Yetkisiz işlem', ['status'=>403]); }
            if(empty($params['content'])) return new WP_Error('invalid_data', 'İçerik boş olamaz', ['status'=>400]);
            $updated_comment = $comment_cls->update($id, (string)$params['content']);
            return rest_ensure_response($updated_comment);
        } else {
            if(empty($params['task_id']) || empty($params['content'])) return new WP_Error('invalid_data', 'Missing data', ['status'=>400]);
            $comment = $comment_cls->add($params['task_id'], (string)$params['content']);
            return rest_ensure_response($comment);
        }
    }
    if ($method === 'DELETE') {
        $id = $request->get_param('id');
        $comment = $comment_cls->get($id);
        if(!$comment || $comment->user_id != get_current_user_id()) { return new WP_Error('forbidden', 'Yetkisiz işlem', ['status'=>403]); }
        $comment_cls->delete($id);
        return ['success' => true];
    }
}

function h2l_api_manage_project($request) {
    global $wpdb; $table_projects = $wpdb->prefix . 'h2l_projects'; $table_folders = $wpdb->prefix . 'h2l_folders';
    $method = $request->get_method(); $id = $request->get_param('id'); $params = $request->get_json_params(); $current_user_id = get_current_user_id();
    if ($method === 'DELETE') { 
        $project = $wpdb->get_row($wpdb->prepare("SELECT owner_id FROM $table_projects WHERE id = %d", $id));
        if ($project && $project->owner_id != $current_user_id) { return new WP_Error('forbidden', 'Sadece proje sahibi silebilir.', ['status'=>403]); }
        $wpdb->update($table_projects, ['status' => 'trash'], ['id' => $id]); 
        return ['success' => true]; 
    }
    
    $new_managers_notify = [];

    if ($id) { 
        // GÜNCELLEME
        $old_managers = [];
        $current_proj = $wpdb->get_row($wpdb->prepare("SELECT managers FROM $table_projects WHERE id = %d", $id));
        if ($current_proj && !empty($current_proj->managers)) {
            $old_managers = json_decode($current_proj->managers, true);
            if(!is_array($old_managers)) $old_managers = [];
        }

        $data = [];
        if (isset($params['title'])) $data['title'] = sanitize_text_field((string)$params['title']);
        if (isset($params['folderId'])) $data['folder_id'] = intval($params['folderId']);
        if (isset($params['color'])) $data['color'] = sanitize_hex_color((string)$params['color']);
        if (isset($params['viewType'])) $data['view_type'] = sanitize_text_field((string)$params['viewType']);
        if (isset($params['managers'])) {
            $managers = $params['managers'];
            if (isset($params['folderId'])) {
                $folder = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_folders WHERE id = %d", $params['folderId']));
                if ($folder && $folder->access_type === 'private') { $managers = []; }
            }
            $clean_managers = array_map('strval', $managers);
            $data['managers'] = json_encode($clean_managers);
            $new_managers_notify = array_diff($clean_managers, $old_managers);
        }
        
        // GÜNCELLEME: is_favorite kişisel tabloya kaydedilir, proje tablosuna değil
        if (isset($params['is_favorite'])) {
            $is_fav = !empty($params['is_favorite']) ? 1 : 0;
            $table_favs = $wpdb->prefix . 'h2l_user_favorites';
            if ($is_fav) {
                $wpdb->replace($table_favs, ['user_id' => $current_user_id, 'project_id' => $id, 'created_at' => current_time('mysql')]);
            } else {
                $wpdb->delete($table_favs, ['user_id' => $current_user_id, 'project_id' => $id]);
            }
            // Not: $data içine 'is_favorite' eklemiyoruz
        }
        
        if (!empty($data)) { $wpdb->update($table_projects, $data, ['id' => $id]); }
        $new_id = $id; 

    } else { 
        // YENİ EKLEME
        $folder_id = intval($params['folderId'] ?? 0);
        $managers = $params['managers'] ?? [];
        if ($folder_id > 0) {
            $folder = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_folders WHERE id = %d", $folder_id));
            if ($folder && $folder->access_type === 'private') $managers = [];
        }
        $clean_managers = array_map('strval', $managers);
        $data = [ 'title' => sanitize_text_field((string)($params['title'] ?? '')), 'folder_id' => $folder_id, 'color' => sanitize_hex_color((string)($params['color'] ?? '#808080')), 'view_type' => sanitize_text_field((string)($params['viewType'] ?? 'list')), 'managers' => json_encode($clean_managers), 'owner_id' => $current_user_id, 'created_at' => current_time('mysql'), 'status' => 'active' ];
        // Not: Yeni projede varsayılan favori yoktur (veya istenirse eklenebilir)
        
        $wpdb->insert($table_projects, $data); 
        $new_id = $wpdb->insert_id; 
        
        // Yeni projeyi oluşturan kişi favoriye eklemek istediyse
        if (isset($params['is_favorite']) && !empty($params['is_favorite'])) {
            $table_favs = $wpdb->prefix . 'h2l_user_favorites';
            $wpdb->replace($table_favs, ['user_id' => $current_user_id, 'project_id' => $new_id, 'created_at' => current_time('mysql')]);
        }

        $new_managers_notify = $clean_managers;
    }

    // YÖNETİCİ BİLDİRİMİ GÖNDER
    if ( !empty($new_managers_notify) && class_exists('H2L_Reminder') ) {
        $reminder = new H2L_Reminder();
        $reminder->send_project_invite_notification($new_id, $new_managers_notify);
    }

    $proj = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_projects WHERE id=%d", $new_id));
    
    // Response için favori durumunu ekle
    $fav_check = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->prefix}h2l_user_favorites WHERE user_id = %d AND project_id = %d", $current_user_id, $new_id));
    $proj->is_favorite = $fav_check > 0;
    
    return $proj;
}

function h2l_api_manage_folder($request) {
    global $wpdb; $table = $wpdb->prefix . 'h2l_folders';
    $method = $request->get_method(); $id = $request->get_param('id'); $params = $request->get_json_params();
    if ($method === 'DELETE') { $wpdb->delete($table, ['id' => $id]); return ['success' => true]; }
    if ($id) {
        $data = [];
        if(isset($params['name'])) $data['name'] = sanitize_text_field((string)$params['name']);
        if(isset($params['access_type'])) $data['access_type'] = sanitize_text_field((string)$params['access_type']);
        if(isset($params['description'])) $data['description'] = sanitize_textarea_field((string)$params['description']);
        if(!empty($data)) $wpdb->update($table, $data, ['id'=>$id]);
        $new_id=$id;
    } else {
        $data = ['name'=>sanitize_text_field((string)($params['name']??'')),'access_type'=>sanitize_text_field((string)($params['access_type']??'private')),'description'=>sanitize_textarea_field((string)($params['description']??'')),'owner_id'=>get_current_user_id()];
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
        if(isset($params['name'])) $data['name'] = sanitize_text_field((string)$params['name']);
        if(isset($params['projectId'])) $data['project_id'] = intval($params['projectId']);
        if(isset($params['sortOrder'])) $data['sort_order'] = intval($params['sortOrder']);
        if(!empty($data)) $wpdb->update($table, $data, ['id' => $id]); 
        $new_id = $id;
    } else {
        $data = ['name' => sanitize_text_field((string)($params['name']??'')), 'project_id' => intval($params['projectId']??0), 'sort_order' => intval($params['sortOrder'] ?? 0), 'created_at' => current_time('mysql')];
        $wpdb->insert($table, $data); 
        $new_id = $wpdb->insert_id;
    }
    return $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $new_id));
}
?>