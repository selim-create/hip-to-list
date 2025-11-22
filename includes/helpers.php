<?php
// Küçük yardımcı fonksiyonlar

function h2l_get_table_name( $table_suffix ) {
    global $wpdb;
    $prefix = defined('H2L_DB_PREFIX') ? H2L_DB_PREFIX : 'h2l_';
    return $wpdb->prefix . $prefix . $table_suffix;
}

/**
 * Gelişmiş Türkçe Doğal Dil Tarih Çözümleyici
 * Örnekler: "yarın", "yarın 14:00", "pazartesi", "gelecek hafta", "2 gün sonra"
 */
function h2l_parse_due_date( $text ) {
    $text = mb_strtolower( $text, 'UTF-8' );
    $timestamp = null;
    $now = current_time( 'timestamp' );
    
    // Günlük İfadeler
    if ( strpos( $text, 'bugün' ) !== false ) {
        $timestamp = $now;
    } elseif ( strpos( $text, 'yarın' ) !== false ) {
        $timestamp = strtotime( '+1 day', $now );
    } elseif ( strpos( $text, 'dün' ) !== false ) { // Genelde kullanılmaz ama ekleyelim
        $timestamp = strtotime( '-1 day', $now );
    }
    
    // Hafta İfadeler (gelecek hafta, haftaya)
    elseif ( strpos( $text, 'gelecek hafta' ) !== false || strpos( $text, 'haftaya' ) !== false ) {
        $timestamp = strtotime( '+1 week', $now );
    }

    // Gün İsimleri (pazartesi, salı...)
    // PHP İngilizce günleri bekler, mapping yapıyoruz.
    $days = [
        'pazartesi' => 'monday',
        'salı'      => 'tuesday',
        'çarşamba'  => 'wednesday',
        'perşembe'  => 'thursday',
        'cuma'      => 'friday',
        'cumartesi' => 'saturday',
        'pazar'     => 'sunday'
    ];

    foreach ( $days as $tr => $en ) {
        if ( strpos( $text, $tr ) !== false ) {
            // Todoist mantığı: Bugün günlerden Salı ise ve "Salı" yazılırsa, haftaya Salı kastedilir.
            $timestamp = strtotime( "next $en", $now );
            break;
        }
    }

    // "X gün sonra" yapısı (Regex)
    if ( preg_match( '/(\d+)\s+gün\s+sonra/', $text, $matches ) ) {
        $days_to_add = intval( $matches[1] );
        $timestamp = strtotime( "+$days_to_add days", $now );
    }

    // Saat Algılama (14:00, 09.30 gibi)
    if ( $timestamp ) {
        // Önce tarihi Y-m-d formatına al
        $date_str = date( 'Y-m-d', $timestamp );
        
        if ( preg_match( '/(\d{1,2})[:.](\d{2})/', $text, $time_matches ) ) {
            $hour = str_pad( $time_matches[1], 2, '0', STR_PAD_LEFT );
            $minute = $time_matches[2];
            return "$date_str $hour:$minute:00";
        } else {
            // Saat belirtilmediyse varsayılan olarak gün sonu (veya null bırakılabilir)
            return "$date_str 23:59:59";
        }
    }
    
    return null;
}

/**
 * Her kullanıcı için varsayılan Klasör ve Proje kontrolü
 */
function h2l_check_default_user_data( $user_id = null ) {
    global $wpdb;
    
    if ( ! $user_id ) {
        $user_id = get_current_user_id();
    }
    
    if ( ! $user_id ) return;

    $table_folders = h2l_get_table_name('folders');
    $table_projects = h2l_get_table_name('projects');

    if( $wpdb->get_var("SHOW TABLES LIKE '$table_folders'") != $table_folders ) return;

    // 1. Inbox Klasörü
    $inbox_folder = $wpdb->get_row( $wpdb->prepare( 
        "SELECT id FROM $table_folders WHERE owner_id = %d AND slug = 'inbox'", 
        $user_id 
    ) );

    $folder_id = null;

    if ( ! $inbox_folder ) {
        $wpdb->insert( $table_folders, array(
            'name' => 'Inbox',
            'slug' => 'inbox',
            'description' => 'Gelen Kutusu',
            'access_type' => 'private',
            'owner_id' => $user_id
        ));
        $folder_id = $wpdb->insert_id;
    } else {
        $folder_id = $inbox_folder->id;
    }

    // 2. Inbox Projesi
    $inbox_project = $wpdb->get_row( $wpdb->prepare( 
        "SELECT id FROM $table_projects WHERE owner_id = %d AND slug = 'inbox-project'", 
        $user_id 
    ) );

    if ( ! $inbox_project && $folder_id ) {
        $wpdb->insert( $table_projects, array(
            'folder_id' => $folder_id,
            'title' => 'Gelen Kutusu',
            'slug' => 'inbox-project',
            'description' => 'Varsayılan toplanma alanı',
            'owner_id' => $user_id,
            'managers' => json_encode(array((string)$user_id)),
            'color' => '#808080',
            'view_type' => 'list',
            'status' => 'active'
        ));
    }
}
?>