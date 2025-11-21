<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

add_action( 'rest_api_init', function () {
    // Başlangıç Verisi (Init)
    register_rest_route( 'h2l/v1', '/init', array(
        'methods' => 'GET',
        'callback' => 'h2l_api_get_init_data',
        'permission_callback' => function () { return is_user_logged_in(); }
    ));

    // Görev CRUD
    register_rest_route( 'h2l/v1', '/tasks(?:/(?P<id>\d+))?', array(
        'methods' => ['POST', 'DELETE'],
        'callback' => 'h2l_api_manage_tasks',
        'permission_callback' => function () { return is_user_logged_in(); }
    ));

    // Proje CRUD
    register_rest_route( 'h2l/v1', '/projects(?:/(?P<id>\d+))?', array(
        'methods' => ['POST', 'DELETE'],
        'callback' => 'h2l_api_manage_projects',
        'permission_callback' => function () { return is_user_logged_in(); }
    ));
    
    // Bölüm CRUD
    register_rest_route( 'h2l/v1', '/sections(?:/(?P<id>\d+))?', array(
        'methods' => ['POST', 'DELETE'],
        'callback' => 'h2l_api_manage_sections',
        'permission_callback' => function () { return is_user_logged_in(); }
    ));
});

/**
 * Kullanıcı profil fotoğrafını en garantili şekilde getiren yardımcı fonksiyon.
 * Bazı eklentiler get_avatar_url filtresini kullanmadığı için HTML çıktısından src alınır.
 */
function h2l_get_user_profile_picture_url( $user_id ) {
    // 1. Önce WordPress'in standart URL fonksiyonunu dene
    $url = get_avatar_url( $user_id, ['size' => 96] );

    // 2. Eğer dönen URL Gravatar ise ve biz yerel bir avatar bekliyorsak, 
    // Eklentilerin HTML çıktısını (get_avatar) kontrol et.
    // Çünkü 'Simple Local Avatars' gibi eklentiler genelde buraya hook atar.
    $avatar_html = get_avatar( $user_id, 96 );
    
    if ( preg_match( '/src=["\']([^"\']+)["\']/', $avatar_html, $matches ) ) {
        $html_url = html_entity_decode( $matches[1] );
        // Eğer HTML'den çıkan URL farklıysa ve 'gravatar.com' içermiyorsa onu kullan
        if ( ! empty( $html_url ) && strpos( $html_url, 'gravatar.com' ) === false ) {
            return $html_url;
        }
        // Eğer elimizdeki URL zaten gravatar ise ama HTML çıktısı farklı bir kaynak gösteriyorsa (CDN vs.)
        // yine HTML çıktısını tercih edebiliriz.
        if ( $url !== $html_url ) {
            return $html_url;
        }
    }

    // 3. ACF veya Özel Meta Kontrolü (Opsiyonel: Eğer yukarıdaki çalışmazsa)
    // Bazı dashboardlar resmi direkt meta olarak tutar.
    $custom_avatar_id = get_user_meta( $user_id, 'simple_local_avatar', true ); // Popüler eklenti meta key
    if ( $custom_avatar_id ) {
        $img = wp_get_attachment_image_src( $custom_avatar_id, 'thumbnail' );
        if ( $img ) return $img[0];
    }

    return $url;
}

function h2l_api_get_init_data() {
    global $wpdb;
    $uid = get_current_user_id();
    
    // Verileri çek
    $folders = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}h2l_folders ORDER BY name ASC");
    $projects = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}h2l_projects WHERE status != 'trash' ORDER BY id DESC");
    $sections = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}h2l_sections ORDER BY sort_order ASC");
    $tasks = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}h2l_tasks WHERE status != 'trash' ORDER BY sort_order ASC, created_at DESC");
    
    // Kullanıcıları formatla - YENİ FONKSİYON KULLANILIYOR
    $users = array_map(function($u) {
        return [
            'id' => $u->ID, 
            'name' => $u->display_name, 
            'avatar' => h2l_get_user_profile_picture_url($u->ID) // Güncellendi
        ];
    }, get_users());

    // Tarih formatlama (Basit)
    foreach($tasks as $task) {
        $task->date_display = $task->due_date ? date_i18n('j M', strtotime($task->due_date)) : '';
        $task->assignees = json_decode($task->assignee_ids ?: '[]');
    }

    return rest_ensure_response(compact('folders', 'projects', 'sections', 'tasks', 'users', 'uid'));
}

function h2l_api_manage_tasks($request) {
    global $wpdb; 
    $table = $wpdb->prefix . 'h2l_tasks';
    $method = $request->get_method();
    $id = $request->get_param('id');
    $p = $request->get_json_params();

    if ($method === 'DELETE') {
        $wpdb->update($table, ['status' => 'trash'], ['id' => $id]);
        return ['success' => true];
    }

    $data = [];
    if(isset($p['title'])) $data['title'] = sanitize_text_field($p['title']);
    if(isset($p['content'])) $data['content'] = wp_kses_post($p['content']);
    if(isset($p['projectId'])) $data['project_id'] = intval($p['projectId']);
    if(isset($p['sectionId'])) $data['section_id'] = intval($p['sectionId']);
    if(isset($p['priority'])) $data['priority'] = intval($p['priority']);
    if(isset($p['status'])) $data['status'] = sanitize_text_field($p['status']);
    if(isset($p['dueDate'])) $data['due_date'] = sanitize_text_field($p['dueDate']);

    if ($id) {
        $wpdb->update($table, $data, ['id' => $id]);
        $new_id = $id;
    } else {
        $data['created_at'] = current_time('mysql');
        $wpdb->insert($table, $data);
        $new_id = $wpdb->insert_id;
    }

    $task = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $new_id));
    $task->date_display = $task->due_date ? date_i18n('j M', strtotime($task->due_date)) : '';
    return $task;
}

function h2l_api_manage_projects($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'h2l_projects';
    $method = $request->get_method();
    $id = $request->get_param('id');
    $p = $request->get_json_params();

    if ($method === 'DELETE') {
        $wpdb->update($table, ['status' => 'trash'], ['id' => $id]);
        return ['success' => true];
    }

    $data = [];
    if(isset($p['title'])) $data['title'] = sanitize_text_field($p['title']);
    if(isset($p['color'])) $data['color'] = sanitize_hex_color($p['color']);
    if(isset($p['viewType'])) $data['view_type'] = sanitize_text_field($p['viewType']);
    if(isset($p['folderId'])) $data['folder_id'] = intval($p['folderId']);
    if(isset($p['managers'])) $data['managers'] = json_encode($p['managers']); // Yöneticileri kaydetme eklendi

    if ($id) {
        $wpdb->update($table, $data, ['id' => $id]);
        return ['id' => $id];
    } else {
        $data['owner_id'] = get_current_user_id();
        $wpdb->insert($table, $data);
        return ['id' => $wpdb->insert_id];
    }
}

function h2l_api_manage_sections($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'h2l_sections';
    $p = $request->get_json_params();
    
    if ($request->get_method() === 'DELETE') {
        $wpdb->delete($table, ['id' => $request->get_param('id')]);
        return true;
    }
    
    $data = ['name' => sanitize_text_field($p['name']), 'project_id' => intval($p['projectId'])];
    $wpdb->insert($table, $data);
    return ['id' => $wpdb->insert_id, 'name' => $data['name'], 'projectId' => $data['project_id']];
}
?>