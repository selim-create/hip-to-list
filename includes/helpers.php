<?php
// Küçük yardımcı fonksiyonlar

function h2l_get_table_name( $table_suffix ) {
    global $wpdb;
    $prefix = defined('H2L_DB_PREFIX') ? H2L_DB_PREFIX : 'h2l_';
    return $wpdb->prefix . $prefix . $table_suffix;
}

/**
 * Gelişmiş Türkçe Doğal Dil Tarih Çözümleyici
 */
function h2l_parse_due_date( $text ) {
    $text = mb_strtolower( $text, 'UTF-8' );
    $timestamp = null;
    $now = current_time( 'timestamp' );
    
    if ( strpos( $text, 'bugün' ) !== false ) {
        $timestamp = $now;
    } elseif ( strpos( $text, 'yarın' ) !== false ) {
        $timestamp = strtotime( '+1 day', $now );
    } elseif ( strpos( $text, 'dün' ) !== false ) { 
        $timestamp = strtotime( '-1 day', $now );
    } elseif ( strpos( $text, 'gelecek hafta' ) !== false || strpos( $text, 'haftaya' ) !== false ) {
        $timestamp = strtotime( '+1 week', $now );
    }

    $days = [
        'pazartesi' => 'monday', 'salı' => 'tuesday', 'çarşamba' => 'wednesday',
        'perşembe' => 'thursday', 'cuma' => 'friday', 'cumartesi' => 'saturday', 'pazar' => 'sunday'
    ];

    foreach ( $days as $tr => $en ) {
        if ( strpos( $text, $tr ) !== false ) {
            $timestamp = strtotime( "next $en", $now );
            break;
        }
    }

    if ( preg_match( '/(\d+)\s+gün\s+sonra/', $text, $matches ) ) {
        $days_to_add = intval( $matches[1] );
        $timestamp = strtotime( "+$days_to_add days", $now );
    }

    if ( $timestamp ) {
        $date_str = date( 'Y-m-d', $timestamp );
        if ( preg_match( '/(\d{1,2})[:.](\d{2})/', $text, $time_matches ) ) {
            $hour = str_pad( $time_matches[1], 2, '0', STR_PAD_LEFT );
            $minute = $time_matches[2];
            return "$date_str $hour:$minute:00";
        } else {
            return "$date_str 23:59:59";
        }
    }
    return null;
}

/**
 * Varsayılan Kullanıcı Verileri (Inbox & Notlarım)
 * Güvenlik Notu: access_type = 'private' olduğundan emin olunur.
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

    // 1. Inbox Klasörü (ÖZEL)
    // Slug'ı 'inbox-UID' şeklinde yaparak benzersizlik garantilenir, ancak user_id ile sorgulandığı için 'inbox' da yeterlidir.
    // Güvenlik için 'access_type' zorlanmalıdır.
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
            'access_type' => 'private', // ZORUNLU ÖZEL
            'owner_id' => $user_id,
            'created_at' => current_time('mysql')
        ));
        $folder_id = $wpdb->insert_id;
    } else {
        $folder_id = $inbox_folder->id;
        // Mevcut klasörün 'private' olduğundan emin ol (Güvenlik yaması)
        $wpdb->update($table_folders, ['access_type' => 'private'], ['id' => $folder_id]);
    }

    // 2. Inbox Projesi (Notlarım) - (ÖZEL)
    $inbox_project = $wpdb->get_row( $wpdb->prepare( 
        "SELECT id FROM $table_projects WHERE owner_id = %d AND slug = 'inbox-project'", 
        $user_id 
    ) );

    if ( ! $inbox_project && $folder_id ) {
        $wpdb->insert( $table_projects, array(
            'folder_id' => $folder_id,
            'title' => 'Notlarım', // Todoist tarzı 'My Projects' yerine 'Notlarım' veya 'Gelen Kutusu'
            'slug' => 'inbox-project',
            'description' => 'Kişisel notlar ve görevler',
            'owner_id' => $user_id,
            'managers' => json_encode([]), // Kimse ekli değil
            'color' => '#808080',
            'view_type' => 'list',
            'status' => 'active',
            'created_at' => current_time('mysql')
        ));
    }
}
?>