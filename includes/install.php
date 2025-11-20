<?php
/**
 * Veritabanı Kurulum ve URL Yapılandırma
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

function h2l_install_db() {
    global $wpdb;
    $charset_collate = $wpdb->get_charset_collate();

    require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );

    // 1. Folders
    $sql = "CREATE TABLE {$wpdb->prefix}h2l_folders (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        name varchar(120) NOT NULL,
        slug varchar(120) NOT NULL,
        description text,
        access_type varchar(20) DEFAULT 'private',
        owner_id bigint(20) NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        KEY owner_id (owner_id)
    ) $charset_collate;";
    dbDelta( $sql );

    // 2. Projects
    $sql = "CREATE TABLE {$wpdb->prefix}h2l_projects (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        folder_id bigint(20) NOT NULL,
        title varchar(120) NOT NULL,
        slug varchar(120) NOT NULL,
        description text,
        owner_id bigint(20) NOT NULL,
        managers text,
        color varchar(20) DEFAULT '#808080',
        view_type varchar(20) DEFAULT 'list',
        status varchar(20) DEFAULT 'active',
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        KEY folder_id (folder_id)
    ) $charset_collate;";
    dbDelta( $sql );

    // 3. Sections
    $sql = "CREATE TABLE {$wpdb->prefix}h2l_sections (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        project_id bigint(20) NOT NULL,
        name varchar(100) NOT NULL,
        sort_order int(11) DEFAULT 0,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        KEY project_id (project_id)
    ) $charset_collate;";
    dbDelta( $sql );

    // 4. Tasks
    $sql = "CREATE TABLE {$wpdb->prefix}h2l_tasks (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        project_id bigint(20) NOT NULL,
        section_id bigint(20) DEFAULT 0,
        parent_task_id bigint(20) DEFAULT 0,
        title text NOT NULL,
        slug varchar(200),
        content longtext,
        priority tinyint(1) DEFAULT 4,
        status varchar(50) DEFAULT 'open',
        assignee_ids text,
        location text,
        reminder_enabled tinyint(1) DEFAULT 1,
        due_date datetime DEFAULT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        completed_at datetime DEFAULT NULL,
        sort_order int(11) DEFAULT 0,
        PRIMARY KEY  (id),
        KEY project_id (project_id)
    ) $charset_collate;";
    dbDelta( $sql );

    // 5. Task Labels
    $sql = "CREATE TABLE {$wpdb->prefix}h2l_task_labels (
        task_id bigint(20) NOT NULL,
        label_id bigint(20) NOT NULL,
        PRIMARY KEY  (task_id, label_id)
    ) $charset_collate;";
    dbDelta( $sql );

    // 6. Labels
    $sql = "CREATE TABLE {$wpdb->prefix}h2l_labels (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        name varchar(50) NOT NULL,
        slug varchar(50) NOT NULL,
        color varchar(20) DEFAULT '#808080',
        PRIMARY KEY  (id)
    ) $charset_collate;";
    dbDelta( $sql );

    add_option( 'h2l_db_version', '1.4.1' );
    
    // Sayfa ve URL
    h2l_create_app_page();
    h2l_add_rewrite_rules();
    flush_rewrite_rules();

    if ( function_exists('h2l_check_default_user_data') ) h2l_check_default_user_data();
}

function h2l_create_app_page() {
    $slug = 'gorevler';
    $query = new WP_Query( array( 'post_type' => 'page', 'name' => $slug, 'posts_per_page' => 1 ) );
    if ( ! $query->have_posts() ) {
        $pid = wp_insert_post( array(
            'post_type' => 'page', 'post_title' => 'Görevler', 'post_content' => '',
            'post_status' => 'publish', 'post_author' => 1, 'post_name' => $slug
        ));
        update_option( 'h2l_app_page_id', $pid );
    }
    wp_reset_postdata();
}

function h2l_add_rewrite_rules() {
    add_rewrite_rule('^gorevler/proje/([0-9]+)/?', 'index.php?pagename=gorevler', 'top');
    add_rewrite_rule('^gorevler/gorev/([0-9]+)/?', 'index.php?pagename=gorevler', 'top');
    add_rewrite_rule('^gorevler/(.+)/?', 'index.php?pagename=gorevler', 'top');
}
add_action('init', 'h2l_add_rewrite_rules');
?>