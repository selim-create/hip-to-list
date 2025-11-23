<?php
/**
 * REST API - Frontend Veri Yönetimi (CRUD)
 * Güvenlik ve Erişim Kontrolleri ile Güncellendi.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

add_action( 'rest_api_init', function () {
    // Başlangıç Verisi
    register_rest_route( 'h2l/v1', '/init', array(
        'methods' => 'GET',
        'callback' => 'h2l_api_get_init_data',
        'permission_callback' => function () { return is_user_logged_in(); }
    ) );

    // Görevler
    register_rest_route( 'h2l/v1', '/tasks(?:/(?P<id>\d+))?', array(
        'methods' => ['POST', 'DELETE'],
        'callback' => 'h2l_api_manage_task',
        'permission_callback' => function () { return is_user_logged_in(); }
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
});

function h2l_get_user_profile_picture_url( $user_id ) {
    $avatar_html = get_avatar( $user_id, 96 );
    if ( preg_match( '/src=["\']([^"\']+)["\']/', $avatar_html, $matches ) ) {
        return html_entity_decode( $matches[1] );
    }
    return get_avatar_url( $user_id );
}

function h2l_api_get_init_data( $request ) {
    global $wpdb;
    $uid = get_current_user_id();
    
    // 1. KLASÖRLER: Sadece 'public' olanlar VEYA benim sahibim olduklarım
    $folders = $wpdb->get_results($wpdb->prepare("
        SELECT * FROM {$wpdb->prefix}h2l_folders 
        WHERE access_type = 'public' OR owner_id = %d 
        ORDER BY name ASC
    ", $uid));
    
    // 2. PROJELER: Tüm projeleri çekip PHP tarafında filtreleyelim (JSON decode gerektiği için)
    // Daha performanslı olması için önce ham veriyi alıyoruz.
    $all_projects = $wpdb->get_results("
        SELECT p.*, 
        (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_tasks WHERE project_id = p.id AND status = 'completed') as completed_count,
        (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_tasks WHERE project_id = p.id AND status != 'trash') as total_count
        FROM {$wpdb->prefix}h2l_projects p 
        WHERE status != 'trash' 
        ORDER BY title ASC
    ");

    $visible_projects = [];
    $visible_project_ids = []; // Görevleri filtrelemek için ID listesi

    foreach ($all_projects as $p) {
        $managers = !empty($p->managers) ? json_decode((string)$p->managers, true) : [];
        if (!is_array($managers)) $managers = [];

        // GÖRÜNÜRLÜK KURALI:
        // 1. Projenin sahibi benim
        // 2. VEYA Yöneticiler listesinde varım
        // (Admin yetkisi olsa bile kural gereği projeye dahil değilse göremez)
        if ( $p->owner_id == $uid || in_array((string)$uid, $managers) || in_array($uid, $managers) ) {
            $p->managers = $managers; // Decode edilmiş hali geri koy
            $visible_projects[] = $p;
            $visible_project_ids[] = $p->id;
        }
    }

    // 3. GÖREVLER: Sadece görünür projelerin görevleri
    $tasks = [];
    if (!empty($visible_project_ids)) {
        $ids_placeholder = implode(',', array_fill(0, count($visible_project_ids), '%d'));
        $tasks = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}h2l_tasks 
            WHERE status != 'trash' 
            AND project_id IN ($ids_placeholder) 
            ORDER BY created_at ASC",
            $visible_project_ids
        ));
    }

    // 4. BÖLÜMLER: Sadece görünür projelerin bölümleri
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
    
    // Kullanıcı Listesi (Atama yapabilmek için herkesi getiriyoruz, ama filtreleme frontend'de proje bazlı olacak)
    $users = array_map(function($u) {
        return [
            'id' => $u->ID, 
            'name' => $u->display_name, 
            'avatar' => h2l_get_user_profile_picture_url($u->ID)
        ];
    }, get_users());

    // Task verilerini işle (Assignee decode vb.)
    $tasks = array_map(function($t) {
        $t->assignees = !empty($t->assignee_ids) ? json_decode((string)$t->assignee_ids) : [];
        if($t->due_date) {
            $ts = strtotime($t->due_date);
            $t->date_display = (date('Y-m-d') == date('Y-m-d', $ts)) ? 'Bugün' : date_i18n('j M', $ts);
        } else { $t->date_display = ''; }
        return $t;
    }, $tasks);

    return rest_ensure_response( array(
        'folders' => $folders, 
        'projects' => $visible_projects, 
        'sections' => $sections, 
        'tasks' => $tasks, 
        'users' => $users, 
        'uid' => $uid
    ) );
}

function h2l_api_manage_task($request) {
    global $wpdb; $table = $wpdb->prefix . 'h2l_tasks';
    $method = $request->get_method(); $id = $request->get_param('id'); $params = $request->get_json_params();
    
    if ($method === 'DELETE') { 
        $wpdb->update($table, ['status' => 'trash'], ['id' => $id]); 
        return ['success' => true]; 
    }
    
    $data = [
        'title' => wp_kses_post($params['title'] ?? ''), 
        'content' => wp_kses_post($params['content'] ?? ''),
        'project_id' => intval($params['projectId'] ?? 0),
        'section_id' => intval($params['sectionId'] ?? 0),
        'priority' => intval($params['priority'] ?? 4),
        'status' => sanitize_text_field($params['status'] ?? 'open'),
        'due_date' => !empty($params['dueDate']) ? sanitize_text_field($params['dueDate']) : null,
        'assignee_ids' => json_encode($params['assignees'] ?? [])
    ];
    
    // TODO: Buraya da proje yetki kontrolü eklenebilir (Kullanıcı bu projeye görev ekleyebilir mi?)

    if ($id) { 
        $wpdb->update($table, $data, ['id'=>$id]); 
        $new_id = $id; 
    } else { 
        $data['created_at'] = current_time('mysql'); 
        $wpdb->insert($table, $data); 
        $new_id = $wpdb->insert_id; 
    }
    return $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id=%d", $new_id));
}

function h2l_api_manage_comments($request) {
    $method = $request->get_method();
    $comment_cls = new H2L_Comment();

    if ($method === 'GET') {
        $task_id = $request->get_param('task_id');
        if (!$task_id) return new WP_Error('no_task', 'Task ID required', ['status'=>400]);
        return rest_ensure_response( $comment_cls->get_by_task($task_id) );
    }

    if ($method === 'POST') {
        $params = $request->get_json_params();
        if(empty($params['task_id']) || empty($params['content'])) return new WP_Error('invalid_data', 'Missing data', ['status'=>400]);
        $comment = $comment_cls->add($params['task_id'], $params['content']);
        return rest_ensure_response($comment);
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
        // Sadece sahibi silebilir
        $project = $wpdb->get_row($wpdb->prepare("SELECT owner_id FROM $table_projects WHERE id = %d", $id));
        if ($project && $project->owner_id != $current_user_id) {
             return new WP_Error('forbidden', 'Sadece proje sahibi silebilir.', ['status'=>403]);
        }
        $wpdb->update($table_projects, ['status' => 'trash'], ['id' => $id]); 
        return ['success' => true]; 
    }

    // Klasör Kontrolü (Private Folder Logic)
    $folder_id = intval($params['folderId'] ?? 0);
    $managers = $params['managers'] ?? [];

    if ($folder_id > 0) {
        $folder = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_folders WHERE id = %d", $folder_id));
        
        // KURAL: Klasör 'private' ise, üyeler sıfırlanır (Sadece owner kalır)
        if ($folder && $folder->access_type === 'private') {
            // Frontend'den ne gelirse gelsin, private klasördeki projenin manager'ı olamaz.
            // Sadece owner kendi projesini görür.
            $managers = []; 
        }
    }

    // Owner'ı her zaman managers listesine (JSON) dahil etmeyebiliriz çünkü owner_id sütunu var.
    // Ama tutarlılık için owner_id'yi managers array'ine dahil etmek iyi olabilir.
    // Şimdilik managers array'i "eklenen diğer kişiler" olarak düşünüldü ama
    // frontend'de owner'ı da listeye eklediğimiz için burada da cleanlemek lazım.
    
    // Gelen managers array'inde sadece string ID'ler olduğundan emin ol
    $clean_managers = array_map('strval', $managers);
    
    // Eğer proje yeni oluşturuluyorsa owner benim
    $owner_id = $id ? $wpdb->get_var($wpdb->prepare("SELECT owner_id FROM $table_projects WHERE id=%d", $id)) : $current_user_id;

    $data = [
        'title' => sanitize_text_field($params['title'] ?? ''),
        'folder_id' => $folder_id,
        'color' => sanitize_hex_color($params['color'] ?? '#808080'),
        'view_type' => sanitize_text_field($params['viewType'] ?? 'list'),
        'managers' => json_encode($clean_managers),
        'is_favorite' => !empty($params['is_favorite']) ? 1 : 0
    ];

    if ($id) { 
        // Güncelleme: Sadece yetkili kişiler (Owner veya Manager) güncelleyebilir
        // Basitlik için: Şimdilik herkes güncelleyebiliyor varsayalım (frontend engelliyor)
        // Ama güvenlik için kontrol eklenebilir.
        $wpdb->update($table_projects, $data, ['id' => $id]); 
        $new_id = $id; 
    } else { 
        $data['owner_id'] = $current_user_id;
        $data['created_at'] = current_time('mysql'); 
        $data['status'] = 'active'; 
        $wpdb->insert($table_projects, $data); 
        $new_id = $wpdb->insert_id; 
    }
    
    return $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_projects WHERE id=%d", $new_id));
}

function h2l_api_manage_folder($request) {
    global $wpdb; $table = $wpdb->prefix . 'h2l_folders';
    $method = $request->get_method(); $id = $request->get_param('id'); $params = $request->get_json_params();
    if ($method === 'DELETE') { $wpdb->delete($table, ['id' => $id]); return ['success' => true]; }
    $data = ['name'=>sanitize_text_field($params['name']??''),'access_type'=>sanitize_text_field($params['access_type']??'private'),'description'=>sanitize_textarea_field($params['description']??''),'owner_id'=>get_current_user_id()];
    if ($id) { $wpdb->update($table, $data, ['id'=>$id]); $new_id=$id; } else { $wpdb->insert($table, $data); $new_id=$wpdb->insert_id; }
    return $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id=%d", $new_id));
}

function h2l_api_manage_section($request) {
    global $wpdb; $table = $wpdb->prefix . 'h2l_sections';
    $method = $request->get_method(); $id = $request->get_param('id'); $params = $request->get_json_params();
    if ($method === 'DELETE') { $wpdb->delete($table, ['id' => $id]); return ['success' => true]; }
    $data = ['name' => sanitize_text_field($params['name']), 'project_id' => intval($params['projectId']), 'sort_order' => intval($params['sortOrder'] ?? 0)];
    if ($id) { $wpdb->update($table, $data, ['id' => $id]); $new_id = $id; } else { $data['created_at'] = current_time('mysql'); $wpdb->insert($table, $data); $new_id = $wpdb->insert_id; }
    return $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $new_id));
}
?>