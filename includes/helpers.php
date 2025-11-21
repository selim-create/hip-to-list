<?php
// Küçük yardımcı fonksiyonlar

function h2l_get_table_name( $table_suffix ) {
    global $wpdb;
    // H2L_DB_PREFIX sabitinin tanımlı olduğundan emin olalım
    $prefix = defined('H2L_DB_PREFIX') ? H2L_DB_PREFIX : 'h2l_';
    return $wpdb->prefix . $prefix . $table_suffix;
}

/**
 * Basit bir doğal dil tarih çözümleyici (Mock)
 */
function h2l_parse_due_date( $text ) {
    $text = mb_strtolower( $text );
    $date = null;

    if ( strpos( $text, 'bugün' ) !== false ) {
        $date = date( 'Y-m-d 23:59:59' );
    } elseif ( strpos( $text, 'yarın' ) !== false ) {
        $date = date( 'Y-m-d 23:59:59', strtotime( '+1 day' ) );
    }
    
    return $date;
}

/**
 * Her kullanıcı için varsayılan Klasör ve Proje kontrolü
 * (Install dosyasından buraya taşındı)
 */
function h2l_check_default_user_data( $user_id = null ) {
    global $wpdb;
    
    if ( ! $user_id ) {
        $user_id = get_current_user_id();
    }
    
    if ( ! $user_id ) return;

    // Tablo isimlerini helper üzerinden alabiliriz veya manuel oluşturabiliriz
    $table_folders = h2l_get_table_name('folders');
    $table_projects = h2l_get_table_name('projects');

    // Tabloların varlığını kontrol et (henüz dbDelta çalışmadıysa hata vermesin)
    if( $wpdb->get_var("SHOW TABLES LIKE '$table_folders'") != $table_folders ) return;

    // 1. Inbox Klasörü var mı?
    $inbox_folder = $wpdb->get_row( $wpdb->prepare( 
        "SELECT id FROM $table_folders WHERE owner_id = %d AND slug = 'inbox'", 
        $user_id 
    ) );

    $folder_id = null;

    if ( ! $inbox_folder ) {
        $wpdb->insert( $table_folders, array(
            'name' => 'Inbox',
            'slug' => 'inbox',
            'description' => 'Varsayılan özel klasör',
            'access_type' => 'private',
            'owner_id' => $user_id
        ));
        $folder_id = $wpdb->insert_id;
    } else {
        $folder_id = $inbox_folder->id;
    }

    // 2. Notlarım Projesi var mı?
    $notes_project = $wpdb->get_row( $wpdb->prepare( 
        "SELECT id FROM $table_projects WHERE owner_id = %d AND slug = 'notlarim'", 
        $user_id 
    ) );

    if ( ! $notes_project && $folder_id ) {
        $wpdb->insert( $table_projects, array(
            'folder_id' => $folder_id,
            'title' => 'Notlarım',
            'slug' => 'notlarim',
            'description' => 'Varsayılan kişisel proje',
            'owner_id' => $user_id,
            'managers' => json_encode(array((string)$user_id)),
            'color' => '#808080',
            'view_type' => 'list'
        ));
    }
}
?>