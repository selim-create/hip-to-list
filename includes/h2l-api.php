<?php
/**
 * REST API - Frontend Veri Yönetimi (CRUD)
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

    // YENİ: BÖLÜMLER (SECTIONS)
    register_rest_route( 'h2l/v1', '/sections(?:/(?P<id>\d+))?', array(
        'methods' => ['POST', 'DELETE'],
        'callback' => 'h2l_api_manage_section',
        'permission_callback' => function () { return is_user_logged_in(); }
    ) );
});

function h2l_get_user_profile_picture_url( $user_id ) {
    // 1. WordPress'in kendi custom avatar meta'sını kontrol et (Genel bir standart olmasa da bazı temalar/eklentiler kullanır)
    $custom_avatar_url = get_user_meta( $user_id, 'profile_picture_url', true );
    if ( $custom_avatar_url ) {
        return $custom_avatar_url;
    }
    
    // 2. Eğer ACF kullanılıyorsa ve 'user_profile_photo' adında bir alan varsa kontrol et
    if ( function_exists('get_field') ) {
        $acf_image = get_field('user_profile_photo', 'user_' . $user_id);
        if ($acf_image && is_array($acf_image) && isset($acf_image['url'])) {
            return $acf_image['url'];
        } elseif (is_string($acf_image)) {
            return $acf_image; // ACF'ten direkt URL gelirse
        }
    }
    
    // 3. Hiçbir şey bulunamazsa WordPress'in varsayılan/Gravatar URL'sini kullan
    return get_avatar_url( $user_id );
}


function h2l_api_get_init_data( $request ) {
    global $wpdb;
    $uid = get_current_user_id();
    
    $folders = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}h2l_folders ORDER BY name ASC");
    
    $projects = $wpdb->get_results("
        SELECT p.*, 
        (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_tasks WHERE project_id = p.id AND status = 'completed') as completed_count,
        (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_tasks WHERE project_id = p.id AND status != 'trash') as total_count
        FROM {$wpdb->prefix}h2l_projects p 
        WHERE status != 'trash' ORDER BY title ASC
    ");
    
    $sections = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}h2l_sections ORDER BY sort_order ASC");
    $tasks = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}h2l_tasks WHERE status != 'trash' ORDER BY created_at DESC");
    
    // AVATAR DÜZELTİLDİ: Artık özel fonksiyon çağrılıyor
    $users = array_map(function($u) {
        return ['id' => $u->ID, 'name' => $u->display_name, 'avatar' => h2l_get_user_profile_picture_url($u->ID)];
    }, get_users());

    $projects = array_map(function($p) { $p->managers = !empty($p->managers) ? json_decode((string)$p->managers) : []; return $p; }, $projects);
    $tasks = array_map(function($t) {
        $t->assignees = !empty($t->assignee_ids) ? json_decode((string)$t->assignee_ids) : [];
        if($t->due_date) {
            $ts = strtotime($t->due_date);
            $t->date_display = (date('Y-m-d') == date('Y-m-d', $ts)) ? 'Bugün' : date_i18n('j M', $ts);
        } else { $t->date_display = ''; }
        return $t;
    }, $tasks);

    return rest_ensure_response( compact('folders', 'projects', 'sections', 'tasks', 'users', 'uid') );
}

// ... (Diğer API fonksiyonları aynı kalacak) ...
function h2l_api_manage_task($request) {
    global $wpdb; $table = $wpdb->prefix . 'h2l_tasks';
    $method = $request->get_method(); $id = $request->get_param('id'); $params = $request->get_json_params();
    if ($method === 'DELETE') { $wpdb->update($table, ['status' => 'trash'], ['id' => $id]); return ['success' => true]; }
    $data = ['title'=>sanitize_text_field($params['title']??''),'project_id'=>intval($params['projectId']??0),'section_id'=>intval($params['sectionId']??0),'priority'=>intval($params['priority']??4),'status'=>sanitize_text_field($params['status']??'open'),'due_date'=>!empty($params['dueDate'])?sanitize_text_field($params['dueDate']):null,'assignee_ids'=>json_encode($params['assignees']??[])];
    if ($id) { $wpdb->update($table, $data, ['id'=>$id]); $new_id=$id; } else { $data['created_at']=current_time('mysql'); $wpdb->insert($table, $data); $new_id=$wpdb->insert_id; }
    return $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id=%d", $new_id));
}
function h2l_api_manage_project($request) {
    global $wpdb; $table = $wpdb->prefix . 'h2l_projects';
    $method = $request->get_method(); $id = $request->get_param('id'); $params = $request->get_json_params();
    if ($method === 'DELETE') { $wpdb->update($table, ['status' => 'trash'], ['id' => $id]); return ['success' => true]; }
    $data = ['title'=>sanitize_text_field($params['title']??''),'folder_id'=>intval($params['folderId']??0),'color'=>sanitize_hex_color($params['color']??'#808080'),'view_type'=>sanitize_text_field($params['viewType']??'list'),'managers'=>json_encode($params['managers']??[]),'owner_id'=>get_current_user_id()];
    if ($id) { $wpdb->update($table, $data, ['id'=>$id]); $new_id=$id; } else { $data['created_at']=current_time('mysql'); $data['status']='active'; $wpdb->insert($table, $data); $new_id=$wpdb->insert_id; }
    return $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id=%d", $new_id));
}
function h2l_api_manage_folder($request) {
    global $wpdb; $table = $wpdb->prefix . 'h2l_folders';
    $method = $request->get_method(); $id = $request->get_param('id'); $params = $request->get_json_params();
    if ($method === 'DELETE') { $wpdb->delete($table, ['id' => $id]); return ['success' => true]; }
    $data = ['name'=>sanitize_text_field($params['name']??''),'access_type'=>sanitize_text_field($params['access_type']??'private'),'description'=>sanitize_textarea_field($params['description']??''),'owner_id'=>get_current_user_id()];
    if ($id) { $wpdb->update($table, $data, ['id'=>$id]); $new_id=$id; } else { $wpdb->insert($table, $data); $new_id=$wpdb->insert_id; }
    return $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id=%d", $new_id));
}

// BÖLÜM YÖNETİMİ (Section Management)
function h2l_api_manage_section($request) {
    global $wpdb; $table = $wpdb->prefix . 'h2l_sections';
    $method = $request->get_method(); $id = $request->get_param('id'); $params = $request->get_json_params();

    if ($method === 'DELETE') {
        $wpdb->delete($table, ['id' => $id]);
        return ['success' => true];
    }

    $data = [
        'name' => sanitize_text_field($params['name']),
        'project_id' => intval($params['projectId']),
        'sort_order' => intval($params['sortOrder'] ?? 0)
    ];
    
    if ($id) { 
        $wpdb->update($table, $data, ['id' => $id]); 
        $new_id = $id; 
    } else { 
        $data['created_at'] = current_time('mysql'); 
        $wpdb->insert($table, $data); 
        $new_id = $wpdb->insert_id; 
    }
    return $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $new_id));
}
?>