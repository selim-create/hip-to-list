<?php
/**
 * REST API - Frontend Veri Sağlayıcı (Fix: JSON Decode in PHP)
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

add_action( 'rest_api_init', function () {
    register_rest_route( 'h2l/v1', '/init', array(
        'methods' => 'GET',
        'callback' => 'h2l_api_get_init_data',
        'permission_callback' => function () { return is_user_logged_in(); }
    ) );
});

function h2l_api_get_init_data( $request ) {
    global $wpdb;
    $current_user_id = get_current_user_id();
    
    // 1. Klasörler
    $folders = $wpdb->get_results("SELECT id, name, access_type, owner_id FROM {$wpdb->prefix}h2l_folders ORDER BY name ASC");
    
    // 2. Projeler
    $projects = $wpdb->get_results("
        SELECT id, folder_id as folderId, title, color, description, managers, owner_id 
        FROM {$wpdb->prefix}h2l_projects 
        WHERE status != 'trash' 
        ORDER BY title ASC
    ");
    
    // 3. Bölümler
    $sections = $wpdb->get_results("SELECT id, project_id as projectId, name, sort_order FROM {$wpdb->prefix}h2l_sections ORDER BY sort_order ASC");

    // 4. Görevler
    $tasks = $wpdb->get_results("
        SELECT t.id, t.project_id as projectId, t.section_id as sectionId, t.title, t.content, t.priority, t.status, t.due_date, t.assignee_ids, t.created_at
        FROM {$wpdb->prefix}h2l_tasks t
        WHERE t.status != 'trash'
        ORDER BY t.created_at DESC
    ");

    // 5. Kullanıcılar
    $wp_users = get_users();
    $users = array();
    foreach($wp_users as $u) {
        $users[] = array(
            'id' => $u->ID,
            'name' => $u->display_name,
            'avatar' => get_avatar_url($u->ID)
        );
    }

    // --- VERİ TEMİZLEME VE FORMATLAMA ---

    // Projeler: Managers JSON string'ini Array'e çevir
    $formatted_projects = array_map(function($p) {
        $p->managers = !empty($p->managers) ? json_decode((string)$p->managers) : [];
        if(!is_array($p->managers)) $p->managers = [];
        $p->id = (int)$p->id;
        return $p;
    }, $projects);

    // Görevler: Assignees JSON ve Tarih
    $formatted_tasks = array_map(function($t) {
        // Tarih formatı
        $t->date_display = '';
        if($t->due_date) {
            $today = current_time('Y-m-d');
            $task_date = substr($t->due_date, 0, 10);
            if($task_date == $today) $t->date_display = 'Bugün';
            else $t->date_display = date_i18n('j M', strtotime($t->due_date));
        }
        
        // JSON parse hatasını önlemek için PHP tarafında decode
        $t->assignees = !empty($t->assignee_ids) ? json_decode((string)$t->assignee_ids) : [];
        if(!is_array($t->assignees)) $t->assignees = [];
        
        $t->id = (int)$t->id;
        $t->priority = (int)$t->priority;
        $t->projectId = (int)$t->projectId;
        $t->sectionId = (int)$t->sectionId;
        
        return $t;
    }, $tasks);

    return rest_ensure_response( array(
        'currentUser' => $current_user_id,
        'folders' => $folders,
        'projects' => $formatted_projects,
        'sections' => $sections,
        'tasks' => $formatted_tasks,
        'users' => $users
    ));
}
?>