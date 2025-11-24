<?php
/**
 * Site İçi Bildirim Yönetimi
 */

class H2L_Notification {
    private $table;

    public function __construct() {
        global $wpdb;
        $this->table = $wpdb->prefix . 'h2l_notifications';
    }

    public static function create( $user_id, $type, $title, $message = '', $link = '' ) {
        global $wpdb;
        $table = $wpdb->prefix . 'h2l_notifications';

        // Kendine bildirim atmayı engelle (Geliştirme aşamasında kapalı)
        // if ( $user_id == get_current_user_id() && $type !== 'reminder' ) { return; }

        $data = array(
            'user_id'    => $user_id,
            'type'       => $type,
            'title'      => wp_kses_post( $title ),
            'message'    => wp_kses_post( $message ),
            'link'       => esc_url_raw( $link ),
            'is_read'    => 0,
            'created_at' => current_time( 'mysql' )
        );

        $result = $wpdb->insert( $table, $data, array( '%d', '%s', '%s', '%s', '%s', '%d', '%s' ) );

        if ( $result === false ) {
            error_log("H2L Notification Error: Bildirim veritabanına yazılamadı. Tablo: $table. Hata: " . $wpdb->last_error);
        } else {
            // error_log("H2L Notification Success: Bildirim eklendi. User: $user_id");
        }

        return $result;
    }

    public function get_notifications( $user_id, $limit = 20 ) {
        global $wpdb;
        $sql = "SELECT * FROM {$this->table} WHERE user_id = %d ORDER BY is_read ASC, created_at DESC LIMIT %d";
        return $wpdb->get_results( $wpdb->prepare( $sql, $user_id, $limit ) );
    }

    public function get_unread_count( $user_id ) {
        global $wpdb;
        return $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$this->table} WHERE user_id = %d AND is_read = 0", $user_id ) );
    }

    public function mark_as_read( $id ) {
        global $wpdb;
        $user_id = get_current_user_id();
        return $wpdb->update( $this->table, array( 'is_read' => 1 ), array( 'id' => $id, 'user_id' => $user_id ), array( '%d' ), array( '%d', '%d' ) );
    }

    public function mark_all_read( $user_id ) {
        global $wpdb;
        return $wpdb->update( $this->table, array( 'is_read' => 1 ), array( 'user_id' => $user_id, 'is_read' => 0 ), array( '%d' ), array( '%d', '%d' ) );
    }
}
?>