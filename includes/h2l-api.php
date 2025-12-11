<?php
/**
 * REST API - Frontend Veri Yönetimi (CRUD)
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
    register_rest_route( 'h2l/v1', '/crm-search', array('methods' => 'GET', 'callback' => 'h2l_api_search_crm_objects', 'permission_callback' => function () { return is_user_logged_in(); }) );

    // --- EK ENDPOINTLER ---
    register_rest_route( 'h2l/v1', '/upload', array(
        'methods' => 'POST',
        'callback' => 'h2l_api_upload_file',
        'permission_callback' => function () { return is_user_logged_in(); }
    ));
    register_rest_route( 'h2l/v1', '/activity/(?P<type>[a-zA-Z0-9_-]+)/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'h2l_api_get_activity_logs',
        'permission_callback' => function () { return is_user_logged_in(); }
    ));

    register_rest_route( 'h2l/v1', '/user-settings', array(
        array(
            'methods' => 'GET',
            'callback' => 'h2l_api_get_user_settings',
            'permission_callback' => function () { return is_user_logged_in(); }
        ),
        array(
            'methods' => 'POST',
            'callback' => 'h2l_api_save_user_settings',
            'permission_callback' => function () { return is_user_logged_in(); }
        )
    ));

    // --- YENİ EKLENEN: FİLTRELER ---
    register_rest_route( 'h2l/v1', '/filters(?:/(?P<id>\d+))?', array(
        array('methods' => 'POST', 'callback' => 'h2l_api_manage_filter', 'permission_callback' => function () { return is_user_logged_in(); }),
        array('methods' => 'DELETE', 'callback' => 'h2l_api_manage_filter', 'permission_callback' => function () { return is_user_logged_in(); })
    ));

    // --- TOPLANTI ASİSTANI ENDPOINTLERİ ---
    register_rest_route( 'h2l/v1', '/meetings', array('methods' => 'GET','callback' => 'h2l_api_get_meetings','permission_callback' => function () { return is_user_logged_in(); }));
    register_rest_route( 'h2l/v1', '/meetings/start', array('methods' => 'POST','callback' => 'h2l_api_start_meeting','permission_callback' => function () { return is_user_logged_in(); }));
    register_rest_route( 'h2l/v1', '/meetings/(?P<id>\d+)/finish', array('methods' => 'POST','callback' => 'h2l_api_finish_meeting','permission_callback' => function () { return is_user_logged_in(); }));
    register_rest_route( 'h2l/v1', '/meetings/(?P<id>\d+)', array('methods' => 'GET','callback' => 'h2l_api_get_meeting_detail','permission_callback' => function () { return is_user_logged_in(); }));
});

// --- MEVCUT FONKSİYONLAR ---
function h2l_api_get_user_settings() {
    $uid = get_current_user_id();
    $email_pref = get_user_meta($uid, 'h2l_pref_email_notifications', true);
    $in_app_pref = get_user_meta($uid, 'h2l_pref_in_app_notifications', true);
    // YENİ: start_view ayarını çekiyoruz
    $start_view = get_user_meta($uid, 'h2l_pref_start_view', true); 
    $ical_active = get_option('h2l_ical_active', 0);
    $ical_url = '';
    
    if ($ical_active && class_exists('H2L_iCal')) {
        $token = H2L_iCal::get_user_token($uid);
        $ical_url = site_url('?h2l_ical=feed&token=' . $token);
    }

    return rest_ensure_response([
        'email_notifications' => $email_pref !== '0',
        'in_app_notifications' => $in_app_pref !== '0',
        'start_view' => $start_view ?: 'projects', // Varsayılan: Projeler
        'ical_active' => (bool)$ical_active,
        'ical_url' => $ical_url
    ]);
}


function h2l_api_save_user_settings($request) {
    $uid = get_current_user_id();
    $params = $request->get_json_params();

    if (isset($params['email_notifications'])) {
        update_user_meta($uid, 'h2l_pref_email_notifications', $params['email_notifications'] ? '1' : '0');
    }
    if (isset($params['in_app_notifications'])) {
        update_user_meta($uid, 'h2l_pref_in_app_notifications', $params['in_app_notifications'] ? '1' : '0');
    }
    // YENİ: start_view ayarını kaydediyoruz
    if (isset($params['start_view'])) {
        update_user_meta($uid, 'h2l_pref_start_view', sanitize_text_field($params['start_view']));
    }

    return rest_ensure_response(['success' => true]);
}


function h2l_api_upload_file($request) {
    if (empty($_FILES['file'])) {
        return new WP_Error('no_file', 'Dosya bulunamadı.', array('status' => 400));
    }

    $file = $_FILES['file'];
    
    $allowed_mimes = array(
        'jpg|jpeg|jpe' => 'image/jpeg',
        'gif' => 'image/gif',
        'png' => 'image/png',
        'pdf' => 'application/pdf',
        'doc|docx' => 'application/msword',
        'xls|xlsx' => 'application/vnd.ms-excel'
    );
    
    $file_info = wp_check_filetype($file['name'], $allowed_mimes);
    if (!$file_info['ext']) {
        return new WP_Error('invalid_type', 'Bu dosya türüne izin verilmiyor.', array('status' => 400));
    }

    require_once(ABSPATH . 'wp-admin/includes/file.php');
    $upload_overrides = array('test_form' => false);
    $movefile = wp_handle_upload($file, $upload_overrides);

    if ($movefile && !isset($movefile['error'])) {
        $attachment = array(
            'guid'           => $movefile['url'],
            'post_mime_type' => $movefile['type'],
            'post_title'     => preg_replace('/\.[^.]+$/', '', basename($file['name'])),
            'post_content'   => '',
            'post_status'    => 'inherit'
        );
        $attach_id = wp_insert_attachment($attachment, $movefile['file']);
        
        return rest_ensure_response(array(
            'success' => true,
            'url' => $movefile['url'],
            'id' => $attach_id,
            'name' => basename($file['name']),
            'type' => $movefile['type']
        ));
    } else {
        return new WP_Error('upload_error', $movefile['error'], array('status' => 500));
    }
}

function h2l_api_get_activity_logs($request) {
    $type = $request->get_param('type');
    $id = $request->get_param('id');
    $limit = $request->get_param('limit') ? intval($request->get_param('limit')) : 50; 
    
    if (!class_exists('H2L_Activity')) require_once H2L_PATH . 'includes/core/activity.php';
    
    $activity = new H2L_Activity();
    $logs = $activity->get_logs($type, $id);
    
    if (count($logs) > $limit) {
        $logs = array_slice($logs, 0, $limit);
    }
    
    $formatted_logs = array_map(function($log) {
        return [
            'id' => $log->id,
            'message' => H2L_Activity::format_message($log),
            'actor_name' => $log->actor_name,
            'created_at' => $log->created_at,
            'avatar' => h2l_get_user_profile_picture_url($log->actor_id)
        ];
    }, $logs);

    return rest_ensure_response($formatted_logs);
}

// ... Mevcut Toplantı Fonksiyonları ...
function h2l_api_get_meetings() { if ( ! class_exists('H2L_Meeting') ) require_once H2L_PATH . 'includes/core/meeting.php'; $m = new H2L_Meeting(); return rest_ensure_response( $m->get_all( get_current_user_id() ) ); }
function h2l_api_start_meeting($request) { if ( ! class_exists('H2L_Meeting') ) require_once H2L_PATH . 'includes/core/meeting.php'; $params = $request->get_json_params(); $m = new H2L_Meeting(); $id = $m->start( sanitize_text_field($params['title']), sanitize_text_field($params['related_object_type'] ?? ''), intval($params['related_object_id'] ?? 0) ); return rest_ensure_response( ['id' => $id, 'success' => true] ); }
function h2l_api_finish_meeting($request) { if ( ! class_exists('H2L_Meeting') ) require_once H2L_PATH . 'includes/core/meeting.php'; $params = $request->get_json_params(); $id = $request->get_param('id'); $m = new H2L_Meeting(); $transcript = $params['transcript'] ?? ''; $result = $m->finish( $id, $transcript, intval($params['duration_seconds']) ); return rest_ensure_response( $result ); }
function h2l_api_get_meeting_detail($request) { if ( ! class_exists('H2L_Meeting') ) require_once H2L_PATH . 'includes/core/meeting.php'; $m = new H2L_Meeting(); $id = $request->get_param('id'); return rest_ensure_response( $m->get($id) ); }

// ... Mevcut Yardımcı Fonksiyonlar ...
function h2l_api_search_crm_objects($request) { h2l_set_nocache_headers(); $term = sanitize_text_field($request->get_param('term')); $type = sanitize_text_field($request->get_param('type')); if (empty($term) || strlen($term) < 2) return []; $args = [ 's' => $term, 'post_type' => $type ? $type : 'any', 'posts_per_page' => 20, 'post_status' => 'publish' ]; $query = new WP_Query($args); $results = []; foreach ($query->posts as $post) { $pt_obj = get_post_type_object($post->post_type); $pt_label = $pt_obj ? $pt_obj->labels->singular_name : $post->post_type; $results[] = [ 'id' => $post->ID, 'title' => $post->post_title, 'type' => $post->post_type, 'type_label' => $pt_label, 'link' => get_permalink($post->ID) ]; } return rest_ensure_response($results); }
function h2l_api_get_notifications() { h2l_set_nocache_headers(); if ( ! class_exists('H2L_Notification') ) return []; $notify = new H2L_Notification(); $user_id = get_current_user_id(); return rest_ensure_response([ 'list' => $notify->get_notifications($user_id), 'unread_count' => $notify->get_unread_count($user_id) ]); }
function h2l_api_read_notifications($request) { if ( ! class_exists('H2L_Notification') ) return []; $notify = new H2L_Notification(); $params = $request->get_json_params(); if ( isset($params['all']) && $params['all'] ) { $notify->mark_all_read(get_current_user_id()); } elseif ( isset($params['id']) ) { $notify->mark_as_read(intval($params['id'])); } return h2l_api_get_notifications(); }
function h2l_api_trigger_reminders() { if ( class_exists( 'H2L_Reminder' ) ) { $reminder = new H2L_Reminder(); $reminder->process_queue(); return rest_ensure_response(['success' => true, 'message' => 'Reminder check triggered']); } return rest_ensure_response(['success' => false]); }
function h2l_get_user_profile_picture_url( $user_id ) { $avatar_html = get_avatar( $user_id, 96 ); if ( preg_match( '/src=["\']([^"\']+)["\']/', $avatar_html, $matches ) ) { return html_entity_decode( $matches[1] ); } return get_avatar_url( $user_id ); }
function h2l_hydrate_task_crm_data($task) { if (!empty($task->related_object_id) && !empty($task->related_object_type)) { $p = get_post($task->related_object_id); if ($p) { $task->related_object_title = $p->post_title; $task->related_object_link = get_permalink($p->ID); } else { $task->related_object_title = 'Silinmiş Kayıt'; $task->related_object_link = '#'; } } else { $task->related_object_title = null; $task->related_object_link = null; } return $task; }

function h2l_api_get_tasks($request) {
    h2l_set_nocache_headers(); 
    global $wpdb;
    $table = $wpdb->prefix . 'h2l_tasks';
    $params = $request->get_params();
    $where = "WHERE status != 'trash'"; 
    if (isset($params['status'])) { $where .= $wpdb->prepare(" AND status = %s", sanitize_text_field((string)$params['status'])); }
    if (isset($params['project_id'])) { $where .= $wpdb->prepare(" AND project_id = %d", intval($params['project_id'])); }
    if (isset($params['parent_task_id'])) { $where .= $wpdb->prepare(" AND parent_task_id = %d", intval($params['parent_task_id'])); }
    // --- CRM FİLTRELERİ BAŞLANGIÇ ---
    if (isset($params['related_object_id'])) {
        $where .= $wpdb->prepare(" AND related_object_id = %d", intval($params['related_object_id']));
    }
    if (isset($params['related_object_type'])) {
        $where .= $wpdb->prepare(" AND related_object_type = %s", sanitize_text_field($params['related_object_type']));
    }
    $sql = "SELECT t.*, (SELECT title FROM {$wpdb->prefix}h2l_projects WHERE id = t.project_id) as project_name, (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_comments c WHERE c.task_id = t.id) as comment_count FROM $table t $where ORDER BY t.sort_order ASC, t.created_at DESC";
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
            $task = h2l_hydrate_task_crm_data($task);
        }
    }
    return rest_ensure_response($tasks);
}

function h2l_api_get_init_data( $request ) {
    h2l_set_nocache_headers();
    global $wpdb;
    $uid = get_current_user_id();

    if (function_exists('h2l_check_default_user_data')) {
        h2l_check_default_user_data($uid);
    }

    // --- 1. ADIM: PROJELERİ ÇEK ---
    // Önce projeleri çekiyoruz çünkü klasör görünürlüğü buna bağlı.
    // Kural: Sadece Sahibi olduğum VEYA Yöneticisi olduğum projeler.
    
    $uid_str = '"' . $uid . '"';
    
    $sql_projects = "SELECT p.*, 
                    (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_tasks WHERE project_id = p.id AND status = 'completed') as completed_count, 
                    (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_tasks WHERE project_id = p.id AND status != 'trash') as total_count 
                    FROM {$wpdb->prefix}h2l_projects p 
                    WHERE p.status != 'trash' 
                    AND ( 
                        p.owner_id = %d 
                        OR p.managers LIKE %s 
                    )
                    ORDER BY p.title ASC";
                    
    $all_projects = $wpdb->get_results($wpdb->prepare($sql_projects, $uid, '%' . $wpdb->esc_like($uid_str) . '%'));
    
    $fav_ids = $wpdb->get_col($wpdb->prepare("SELECT project_id FROM {$wpdb->prefix}h2l_user_favorites WHERE user_id = %d", $uid));
    
    $visible_projects = [];
    $member_project_ids = [];
    $member_folder_ids = []; // Üyesi olduğum projelerin bulunduğu klasör ID'leri

    foreach ($all_projects as $p) {
        $managers = !empty($p->managers) ? json_decode((string)$p->managers, true) : [];
        if (!is_array($managers)) $managers = [];
        
        $is_owner = ($p->owner_id == $uid);
        $is_manager = in_array((string)$uid, $managers) || in_array($uid, $managers);
        
        // Sadece yetkili olduğum projeleri listeye al
        if ($is_owner || $is_manager) {
            $p->is_member = true;
            $p->managers = $managers;
            $p->is_favorite = in_array($p->id, $fav_ids);
            $visible_projects[] = $p;
            $member_project_ids[] = $p->id;
            
            // Eğer proje bir klasöre bağlıysa, bu klasörü görme hakkı kazanırım
            if (intval($p->folder_id) > 0) {
                $member_folder_ids[] = intval($p->folder_id);
            }
        }
    }
    
    // ID'leri benzersiz yap
    $member_folder_ids = array_unique($member_folder_ids);

    // --- 2. ADIM: KLASÖRLERİ ÇEK ---
    // Kural: Sadece SAHİBİ olduğum klasörler VEYA içinde YETKİLİ PROJEM olan klasörler.
    // Access Type (Public/Private) fark etmeksizin, alakam olmayan klasörü görmem.
    
    $sql_folders = "SELECT * FROM {$wpdb->prefix}h2l_folders WHERE 1=1";
    
    if (empty($member_folder_ids)) {
        // Hiçbir projeye üye değilsem, sadece kendi oluşturduğum klasörleri görürüm
        $sql_folders .= $wpdb->prepare(" AND owner_id = %d", $uid);
    } else {
        // Kendi klasörlerim + İçinde projem olan klasörler
        $ids_placeholders = implode(',', array_fill(0, count($member_folder_ids), '%d'));
        // Parametre sırası: [uid, folder_id_1, folder_id_2, ...]
        $params = array_merge([$uid], $member_folder_ids);
        
        $sql_folders .= $wpdb->prepare(" AND (owner_id = %d OR id IN ($ids_placeholders))", $params);
    }
    
    $sql_folders .= " ORDER BY name ASC";
    
    $folders = $wpdb->get_results($sql_folders);

    // --- 3. ADIM: GÖREVLERİ VE DİĞERLERİNİ ÇEK ---
    
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
            $t = h2l_hydrate_task_crm_data($t);
            return $t;
        }, $tasks);
    }

    $sections = [];
    if (!empty($member_project_ids)) {
        $ids_placeholder = implode(',', array_fill(0, count($member_project_ids), '%d'));
        $sections = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}h2l_sections WHERE project_id IN ($ids_placeholder) ORDER BY sort_order ASC", $member_project_ids));
    }

    $labels = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}h2l_labels ORDER BY name ASC");
    $users = array_map(function($u) { 
        return [ 'id' => $u->ID, 'name' => $u->display_name, 'username' => $u->user_login, 'avatar' => h2l_get_user_profile_picture_url($u->ID) ]; 
    }, get_users());

    if ( ! class_exists('H2L_Filter') ) require_once H2L_PATH . 'includes/core/filter.php';
    $f = new H2L_Filter();
    $filters = $f->get_user_filters( $uid );
    
    $user_prefs = [
        'start_view' => get_user_meta($uid, 'h2l_pref_start_view', true) ?: 'projects'
    ];

    return rest_ensure_response( array(
        'folders' => $folders, 
        'projects' => $visible_projects, 
        'sections' => $sections, 
        'tasks' => $tasks, 
        'users' => $users, 
        'labels' => $labels, 
        'filters' => $filters, 
        'uid' => $uid,
        'user_prefs' => $user_prefs
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
            if (isset($item['section_id'])) { $update_data['section_id'] = intval($item['section_id']); }
            $wpdb->update($table, $update_data, ['id' => intval($item['id'])]);
        }
    } elseif ($type === 'section') {
        $table = $wpdb->prefix . 'h2l_sections';
        foreach ($items as $item) { $wpdb->update($table, ['sort_order' => intval($item['order'])], ['id' => intval($item['id'])]); }
    }
    return ['success' => true];
}

// --- GÜNCELLENMİŞ GÖREV YÖNETİMİ (Tekrarlı Görev ve Log Mantığı ile) ---
function h2l_api_manage_task($request) {
    global $wpdb; 
    $table = $wpdb->prefix . 'h2l_tasks';
    $table_task_labels = $wpdb->prefix . 'h2l_task_labels';
    $table_labels = $wpdb->prefix . 'h2l_labels';
    $method = $request->get_method(); 
    $id = $request->get_param('id'); 
    $params = $request->get_json_params();
    $current_user_id = get_current_user_id();
    
    if (!class_exists('H2L_Activity')) require_once H2L_PATH . 'includes/core/activity.php';
    if (!class_exists('H2L_Task')) require_once H2L_PATH . 'includes/core/task.php';

    if ($method === 'DELETE') { 
        $wpdb->update($table, ['status' => 'trash'], ['id' => $id]); 
        H2L_Activity::log('task', $id, 'deleted');
        return ['success' => true]; 
    }
    
    // --- DÜZELTME: INBOX ID BULMA (Projesiz görevleri yakala) ---
    $target_project_id = intval($params['projectId'] ?? ($params['project_id'] ?? 0));
    
    // Eğer proje ID 0 ise (Metabox'tan geliyorsa), kullanıcının Inbox projesini bul
    if ( $target_project_id === 0 ) {
        $inbox_project = $wpdb->get_row( $wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}h2l_projects WHERE owner_id = %d AND slug = 'inbox-project'",
            $current_user_id
        ));
        
        if ( $inbox_project ) {
            $target_project_id = intval($inbox_project->id);
        }
    }
    // -------------------------------------------------------------

    $new_assignees_for_notify = []; 

    if ($id) {
        // GÜNCELLEME İŞLEMLERİ
        $old_task = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $id));
        $old_assignees = !empty($old_task->assignee_ids) ? json_decode($old_task->assignee_ids) : [];
        if(!is_array($old_assignees)) $old_assignees = [];

        $data = [];
        $changed_fields = [];

        if (isset($params['title']) && $params['title'] !== $old_task->title) { $data['title'] = wp_kses_post((string)$params['title']); $changed_fields[] = 'title'; }
        if (isset($params['content']) && $params['content'] !== $old_task->content) { $data['content'] = wp_kses_post((string)$params['content']); $changed_fields[] = 'content'; }
        
        // Proje değişikliği varsa güncelle
        if (isset($params['projectId'])) { 
            $data['project_id'] = $target_project_id; // Inbox mantığı burada da geçerli
            if ($target_project_id !== intval($old_task->project_id)) $changed_fields[] = 'project_id'; 
        }

        if (isset($params['sectionId']) && intval($params['sectionId']) !== intval($old_task->section_id)) { $data['section_id'] = intval($params['sectionId']); $changed_fields[] = 'section_id'; }
        if (isset($params['priority']) && intval($params['priority']) !== intval($old_task->priority)) { $data['priority'] = intval($params['priority']); $changed_fields[] = 'priority'; }
        
        if (array_key_exists('repeat', $params)) {
            $new_repeat = !empty($params['repeat']) ? sanitize_text_field((string)$params['repeat']) : null;
            if ($new_repeat !== $old_task->recurrence_rule) {
                $data['recurrence_rule'] = $new_repeat;
                $changed_fields[] = 'recurrence_rule';
            }
        }

        if (isset($params['status'])) {
            $new_status = sanitize_text_field((string)$params['status']);
            if ($new_status === 'completed' && !empty($old_task->recurrence_rule)) {
                $task_helper = new H2L_Task();
                $task_helper->handle_recurring_completion($old_task);
                $data['status'] = 'completed';
                $data['completed_at'] = current_time('mysql');
                $data['recurrence_rule'] = null;
            } else {
                $data['status'] = $new_status;
                if ($new_status === 'completed') {
                    $data['completed_at'] = current_time('mysql');
                }
            }
            if ($new_status !== $old_task->status) {
                $changed_fields[] = 'status';
                H2L_Activity::log('task', $id, $new_status === 'completed' ? 'completed' : 'updated', ['new_status' => $new_status]);
            }
        }
        
        if (isset($params['location'])) $data['location'] = sanitize_text_field((string)$params['location']);
        
        if (isset($params['reminder_enabled'])) {
            $data['reminder_enabled'] = $params['reminder_enabled'] ? 1 : 0;
            if ($data['reminder_enabled'] === 1) $data['reminder_sent'] = 0;
        }
        if (array_key_exists('dueDate', $params)) {
            $new_due = !empty($params['dueDate']) ? sanitize_text_field((string)$params['dueDate']) : null;
            $data['due_date'] = $new_due;
            if ($new_due !== $old_task->due_date) {
                $data['reminder_sent'] = 0;
                $changed_fields[] = 'due_date';
            }
        }
        
        if (isset($params['assignees'])) {
            $data['assignee_ids'] = json_encode($params['assignees']);
            $new_assignees_for_notify = array_diff($params['assignees'], $old_assignees);
            if (!empty($new_assignees_for_notify)) {
                $changed_fields[] = 'assignees';
                H2L_Activity::log('task', $id, 'assigned', ['assignees' => $new_assignees_for_notify]);
            }
        }

        if (isset($params['sortOrder'])) $data['sort_order'] = intval($params['sortOrder']);
        
        if (isset($params['related_object_type'])) $data['related_object_type'] = sanitize_text_field($params['related_object_type']);
        if (isset($params['related_object_id'])) $data['related_object_id'] = intval($params['related_object_id']);

        if (!empty($data)) { 
            $wpdb->update($table, $data, ['id'=>$id]); 
            if(!in_array('status', $changed_fields) && !in_array('assignees', $changed_fields) && !empty($changed_fields)) {
                H2L_Activity::log('task', $id, 'updated', ['changed_fields' => $changed_fields]);
            }
        }
        $new_id = $id;

    } else {
        // YENİ GÖREV OLUŞTURMA
        $max_sort = $wpdb->get_var($wpdb->prepare("SELECT MAX(sort_order) FROM $table WHERE project_id = %d", $target_project_id));
        
        $assignees = isset($params['assignees']) ? $params['assignees'] : [];
        $new_assignees_for_notify = $assignees; 

        $data = [
            'title' => wp_kses_post((string)($params['title'] ?? '')), 
            'content' => wp_kses_post((string)($params['content'] ?? '')),
            'project_id' => $target_project_id, // Düzeltilmiş (Inbox) ID
            'section_id' => intval($params['sectionId'] ?? 0),
            'parent_task_id' => intval($params['parent_task_id'] ?? 0),
            'priority' => intval($params['priority'] ?? 4), 
            'status' => sanitize_text_field((string)($params['status'] ?? 'open')),
            'due_date' => !empty($params['dueDate']) ? sanitize_text_field((string)$params['dueDate']) : null,
            'recurrence_rule' => !empty($params['repeat']) ? sanitize_text_field((string)$params['repeat']) : null,
            'assignee_ids' => json_encode($assignees),
            'reminder_enabled' => !empty($params['reminder_enabled']) ? 1 : 0, 
            'reminder_sent' => 0, 
            'created_at' => current_time('mysql'),
            'sort_order' => $max_sort ? $max_sort + 1 : 0,
            'related_object_type' => sanitize_text_field($params['related_object_type'] ?? ''),
            'related_object_id' => intval($params['related_object_id'] ?? 0),
            'meeting_id' => intval($params['meeting_id'] ?? 0)
        ];
        $wpdb->insert($table, $data); 
        $new_id = $wpdb->insert_id; 
        
        H2L_Activity::log('task', $new_id, 'created');
    }

    if ( !empty($new_assignees_for_notify) && class_exists('H2L_Reminder') ) {
        $reminder = new H2L_Reminder();
        $reminder->send_assignment_notification($new_id, $new_assignees_for_notify);
    }

    // Etiketler
    if (isset($params['labels']) && is_array($params['labels'])) {
        if (count($params['labels']) > 3) { $params['labels'] = array_slice($params['labels'], 0, 3); }
        $wpdb->delete($table_task_labels, ['task_id' => $new_id]);
        foreach ($params['labels'] as $label_name) {
            $label_name = sanitize_text_field((string)$label_name);
            // Etiket var mı kontrol et, yoksa oluştur
            $label_id = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table_labels WHERE name = %s", $label_name));
            if (!$label_id) { 
                $wpdb->insert($table_labels, ['name' => $label_name, 'slug' => sanitize_title($label_name), 'color' => '#808080']); 
                $label_id = $wpdb->insert_id; 
            }
            $wpdb->insert($table_task_labels, ['task_id' => $new_id, 'label_id' => $label_id]);
        }
    }

    // Yanıtı Hazırla
    $task = $wpdb->get_row($wpdb->prepare("SELECT t.*, (SELECT COUNT(*) FROM {$wpdb->prefix}h2l_comments c WHERE c.task_id = t.id) as comment_count FROM $table t WHERE id=%d", $new_id));
    
    // Etiketleri ve Atananları Hydrate Et
    $task->labels = $wpdb->get_results($wpdb->prepare("SELECT l.* FROM {$wpdb->prefix}h2l_task_labels tl JOIN {$wpdb->prefix}h2l_labels l ON tl.label_id = l.id WHERE tl.task_id = %d", $new_id));
    $task->assignees = !empty($task->assignee_ids) ? json_decode((string)$task->assignee_ids) : [];
    if($task->due_date) { 
        $ts = strtotime($task->due_date); 
        $task->date_display = (date('Y-m-d') == date('Y-m-d', $ts)) ? 'Bugün' : date_i18n('j M', $ts); 
    } else { 
        $task->date_display = ''; 
    }
    $task = h2l_hydrate_task_crm_data($task);
    
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
            // YENİ: Dosya desteği (comments class'ı update edilmeli ama şimdilik extra data ile)
            // Comment sınıfı add metodunda files_json parametresi kabul etmiyorsa, comment eklendikten sonra update edebiliriz.
            // Ama ideal olan Comment sınıfını güncellemektir. Şimdilik API içinde update yapalım.
            
            $files_json = isset($params['files']) ? json_encode($params['files']) : null;
            
            $comment = $comment_cls->add($params['task_id'], (string)$params['content']);
            
            if ($comment && $files_json) {
                global $wpdb;
                $wpdb->update(
                    $wpdb->prefix . 'h2l_comments',
                    array('files_json' => $files_json),
                    array('id' => $comment->id)
                );
                $comment->files_json = $files_json;
            }
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
        $project = $wpdb->get_row($wpdb->prepare("SELECT owner_id, slug FROM $table_projects WHERE id = %d", $id));
        if ($project && $project->owner_id != $current_user_id) { return new WP_Error('forbidden', 'Sadece proje sahibi silebilir.', ['status'=>403]); }
        
        // GÜVENLİK: Varsayılan Projeyi Silmeyi Engelle
        if ($project && ($project->slug === 'inbox-project' || $project->slug === 'notlarim')) {
            return new WP_Error('forbidden', 'Bu proje sistem tarafından korunmaktadır ve silinemez.', ['status'=>403]);
        }

        $wpdb->update($table_projects, ['status' => 'trash'], ['id' => $id]); 
        H2L_Activity::log('project', $id, 'deleted');
        return ['success' => true]; 
    }
    $new_managers_notify = [];
    if ($id) { 
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
        if (isset($params['is_favorite'])) {
            $is_fav = !empty($params['is_favorite']) ? 1 : 0;
            $table_favs = $wpdb->prefix . 'h2l_user_favorites';
            if ($is_fav) { $wpdb->replace($table_favs, ['user_id' => $current_user_id, 'project_id' => $id, 'created_at' => current_time('mysql')]); } 
            else { $wpdb->delete($table_favs, ['user_id' => $current_user_id, 'project_id' => $id]); }
        }
        if (!empty($data)) { 
            $wpdb->update($table_projects, $data, ['id' => $id]); 
            H2L_Activity::log('project', $id, 'updated');
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
        $data = [ 'title' => sanitize_text_field((string)($params['title'] ?? '')), 'folder_id' => $folder_id, 'color' => sanitize_hex_color((string)($params['color'] ?? '#808080')), 'view_type' => sanitize_text_field((string)($params['viewType'] ?? 'list')), 'managers' => json_encode($clean_managers), 'owner_id' => $current_user_id, 'created_at' => current_time('mysql'), 'status' => 'active' ];
        $wpdb->insert($table_projects, $data); 
        $new_id = $wpdb->insert_id; 
        if (isset($params['is_favorite']) && !empty($params['is_favorite'])) {
            $table_favs = $wpdb->prefix . 'h2l_user_favorites';
            $wpdb->replace($table_favs, ['user_id' => $current_user_id, 'project_id' => $new_id, 'created_at' => current_time('mysql')]);
        }
        $new_managers_notify = $clean_managers;
        H2L_Activity::log('project', $new_id, 'created');
    }
    if ( !empty($new_managers_notify) && class_exists('H2L_Reminder') ) {
        $reminder = new H2L_Reminder();
        $reminder->send_project_invite_notification($new_id, $new_managers_notify);
    }
    $proj = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_projects WHERE id=%d", $new_id));
    $fav_check = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->prefix}h2l_user_favorites WHERE user_id = %d AND project_id = %d", $current_user_id, $new_id));
    $proj->is_favorite = $fav_check > 0;
    return $proj;
}

function h2l_api_manage_folder($request) {
    global $wpdb; $table = $wpdb->prefix . 'h2l_folders';
    $method = $request->get_method(); $id = $request->get_param('id'); $params = $request->get_json_params();
    
    if ($method === 'DELETE') { 
        // GÜVENLİK: Varsayılan Klasörü Silmeyi Engelle
        $folder = $wpdb->get_row($wpdb->prepare("SELECT slug FROM $table WHERE id = %d", $id));
        if ($folder && ($folder->slug === 'inbox' || $folder->slug === 'notlarim')) {
            return new WP_Error('forbidden', 'Bu klasör sistem tarafından korunmaktadır ve silinemez.', ['status'=>403]);
        }

        $wpdb->delete($table, ['id' => $id]); 
        return ['success' => true]; 
    }
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

// --- YENİ FONKSİYON: FİLTRE YÖNETİMİ ---
function h2l_api_manage_filter($request) {
    $method = $request->get_method();
    $id = $request->get_param('id');
    
    if ( ! class_exists('H2L_Filter') ) require_once H2L_PATH . 'includes/core/filter.php';
    $filter_cls = new H2L_Filter();

    if ($method === 'DELETE' && $id) {
        $filter_cls->delete($id);
        return ['success' => true];
    }

    if ($method === 'POST') {
        $params = $request->get_json_params();
        if (empty($params['title']) || empty($params['query'])) {
            return new WP_Error('invalid_data', 'Başlık ve sorgu zorunludur.', ['status' => 400]);
        }
        
        $new_filter = $filter_cls->create($params['title'], $params['query']);
    return rest_ensure_response($new_filter);
    }
}