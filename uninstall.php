<?php
/**
 * Eklenti silindiğinde çalışır.
 * Veritabanı tablolarını ve opsiyonları temizler.
 */

// Eğer WordPress tarafından çağrılmadıysa çık.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

global $wpdb;

// Tablo isimlerini tanımla (wp-config'den prefix'i alarak)
$table_tasks = $wpdb->prefix . 'h2l_tasks';
$table_projects = $wpdb->prefix . 'h2l_projects';

// 1. Tabloları sil
$wpdb->query( "DROP TABLE IF EXISTS $table_tasks" );
$wpdb->query( "DROP TABLE IF EXISTS $table_projects" );

// 2. Ayarları sil
delete_option( 'h2l_db_version' );

// 3. Varsa zamanlanmış cron işlerini temizle
$timestamp = wp_next_scheduled( 'h2l_daily_reminder_check' );
if ( $timestamp ) {
    wp_unschedule_event( $timestamp, 'h2l_daily_reminder_check' );
}
?>