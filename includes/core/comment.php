<?php
/**
 * Yorum (Comment) İşlemleri
 */

class H2L_Comment {
    private $table;

    public function __construct() {
        $this->table = h2l_get_table_name('comments');
    }

    public function add( $task_id, $content, $user_id = null ) {
        global $wpdb;
        
        if ( ! $user_id ) {
            $user_id = get_current_user_id();
        }

        $data = array(
            'task_id'    => $task_id,
            'user_id'    => $user_id,
            'content'    => wp_kses_post( $content ),
            'created_at' => current_time( 'mysql' )
        );

        $inserted = $wpdb->insert( $this->table, $data, array( '%d', '%d', '%s', '%s' ) );

        if ( $inserted ) {
            // Log Activity
            if ( class_exists('H2L_Activity') ) {
                // H2L_Activity::log('task', $task_id, 'comment_added');
            }
            
            $comment_id = $wpdb->insert_id;
            return $this->get( $comment_id );
        }

        return false;
    }

    // YENİ: Yorum Güncelleme
    public function update( $id, $content ) {
        global $wpdb;
        
        $data = array(
            'content' => wp_kses_post( $content )
        );
        
        $updated = $wpdb->update( 
            $this->table, 
            $data, 
            array( 'id' => $id ), 
            array( '%s' ), 
            array( '%d' ) 
        );

        if ( $updated !== false ) {
            return $this->get( $id );
        }
        return false;
    }

    public function get_by_task( $task_id ) {
        global $wpdb;
        $sql = "SELECT * FROM {$this->table} WHERE task_id = %d ORDER BY created_at ASC";
        return $wpdb->get_results( $wpdb->prepare( $sql, $task_id ) );
    }

    /**
     * Görev bazlı yorum sayısını getir
     */
    public function count_by_task( $task_id ) {
        global $wpdb;
        $sql = "SELECT COUNT(*) FROM {$this->table} WHERE task_id = %d";
        return $wpdb->get_var( $wpdb->prepare( $sql, $task_id ) );
    }

    public function get( $id ) {
        global $wpdb;
        return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$this->table} WHERE id = %d", $id ) );
    }

    public function delete( $id ) {
        global $wpdb;
        return $wpdb->delete( $this->table, array( 'id' => $id ) );
    }
}
?>