<?php
/**
 * Veritabanı kurulum işlemleri.
 * Site içi bildirimler için 'h2l_notifications' tablosu eklendi.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function h2l_install_db() {
    global $wpdb;
    $charset_collate = $wpdb->get_charset_collate();

    require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );

    // 1. Folders
    $sql_folders = "CREATE TABLE {$wpdb->prefix}h2l_folders (
  id bigint(20) NOT NULL AUTO_INCREMENT,
  name varchar(120) NOT NULL,
  slug varchar(120) NOT NULL,
  description text,
  access_type varchar(20) DEFAULT 'private',
  owner_id bigint(20) NOT NULL,
  created_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
  PRIMARY KEY  (id),
  KEY owner_id (owner_id)
) $charset_collate;";

    // 2. Projects
    $sql_projects = "CREATE TABLE {$wpdb->prefix}h2l_projects (
  id bigint(20) NOT NULL AUTO_INCREMENT,
  folder_id bigint(20) NOT NULL,
  title varchar(120) NOT NULL,
  slug varchar(120) NOT NULL,
  description text,
  owner_id bigint(20) NOT NULL,
  managers text,
  is_favorite tinyint(1) DEFAULT 0,
  color varchar(20) DEFAULT '#808080',
  view_type varchar(20) DEFAULT 'list',
  status varchar(20) DEFAULT 'active',
  created_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
  updated_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
  PRIMARY KEY  (id),
  KEY folder_id (folder_id)
) $charset_collate;";

    // 3. Sections
    $sql_sections = "CREATE TABLE {$wpdb->prefix}h2l_sections (
  id bigint(20) NOT NULL AUTO_INCREMENT,
  project_id bigint(20) NOT NULL,
  name varchar(100) NOT NULL,
  sort_order int(11) DEFAULT 0,
  created_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
  PRIMARY KEY  (id),
  KEY project_id (project_id)
) $charset_collate;";

    // 4. Tasks
    $sql_tasks = "CREATE TABLE {$wpdb->prefix}h2l_tasks (
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
  reminder_sent tinyint(1) DEFAULT 0,
  due_date datetime DEFAULT NULL,
  created_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
  completed_at datetime DEFAULT NULL,
  sort_order int(11) DEFAULT 0,
  PRIMARY KEY  (id),
  KEY project_id (project_id)
) $charset_collate;";

    // 5. Task Labels
    $sql_task_labels = "CREATE TABLE {$wpdb->prefix}h2l_task_labels (
  task_id bigint(20) NOT NULL,
  label_id bigint(20) NOT NULL,
  PRIMARY KEY  (task_id, label_id)
) $charset_collate;";

    // 6. Labels
    $sql_labels = "CREATE TABLE {$wpdb->prefix}h2l_labels (
  id bigint(20) NOT NULL AUTO_INCREMENT,
  name varchar(50) NOT NULL,
  slug varchar(50) NOT NULL,
  color varchar(20) DEFAULT '#808080',
  PRIMARY KEY  (id)
) $charset_collate;";

    // 7. Comments
    $sql_comments = "CREATE TABLE {$wpdb->prefix}h2l_comments (
  id bigint(20) NOT NULL AUTO_INCREMENT,
  task_id bigint(20) NOT NULL,
  user_id bigint(20) NOT NULL,
  content longtext NOT NULL,
  files_json text,
  created_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
  PRIMARY KEY  (id),
  KEY task_id (task_id)
) $charset_collate;";

    // 8. Activity Log
    $sql_activity = "CREATE TABLE {$wpdb->prefix}h2l_activity_log (
  id bigint(20) NOT NULL AUTO_INCREMENT,
  object_type varchar(50) NOT NULL,
  object_id bigint(20) NOT NULL,
  actor_id bigint(20) NOT NULL,
  action varchar(50) NOT NULL,
  meta_json text,
  created_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
  PRIMARY KEY  (id),
  KEY object_index (object_type, object_id)
) $charset_collate;";

    // 9. Notifications (YENİ)
    $sql_notifications = "CREATE TABLE {$wpdb->prefix}h2l_notifications (
  id bigint(20) NOT NULL AUTO_INCREMENT,
  user_id bigint(20) NOT NULL,
  type varchar(50) NOT NULL,
  title text NOT NULL,
  message text,
  link varchar(255),
  is_read tinyint(1) DEFAULT 0,
  created_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
  PRIMARY KEY  (id),
  KEY user_read (user_id, is_read)
) $charset_collate;";

    // dbDelta çağrıları
    dbDelta( $sql_folders );
    dbDelta( $sql_projects );
    dbDelta( $sql_sections );
    dbDelta( $sql_tasks );
    dbDelta( $sql_task_labels );
    dbDelta( $sql_labels );
    dbDelta( $sql_comments );
    dbDelta( $sql_activity );
    dbDelta( $sql_notifications );

    add_option( 'h2l_db_version', '1.9.0' );
    
    // Sayfayı oluştur
    h2l_create_app_page();
    
    // URL Kurallarını Aktif Et
    h2l_add_rewrite_rules();
    flush_rewrite_rules();

    if ( function_exists('h2l_check_default_user_data') ) {
        h2l_check_default_user_data();
    }
}

function h2l_create_app_page() {
    $slug = 'gorevler';
    $query = new WP_Query( array( 'post_type' => 'page', 'name' => $slug, 'posts_per_page' => 1 ) );
    if ( ! $query->have_posts() ) {
        $pid = wp_insert_post( array(
            'post_type'    => 'page',
            'post_title'   => 'Görevler',
            'post_content' => '',
            'post_status'  => 'publish',
            'post_author'  => 1,
            'post_name'    => $slug
        ));
        update_option( 'h2l_app_page_id', $pid );
    }
    wp_reset_postdata();
}
?>