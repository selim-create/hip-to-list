<?php
/**
 * Yorum (Comment) İşlemleri ve Mention Algılama
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
            $comment_id = $wpdb->insert_id;
            
            if ( class_exists('H2L_Activity') ) {
                H2L_Activity::log('task', $task_id, 'comment_added', ['comment_id' => $comment_id]);
            }

            // Mention Bildirimleri (Parametre olarak raw $content gönderiliyor)
            $this->process_mentions($task_id, $content);

            return $this->get( $comment_id );
        }

        return false;
    }

    /**
     * Metindeki @mentions'ları bul ve bildirim gönder
     */
    private function process_mentions( $task_id, $content ) {
        // DÜZELTME: Regex artık tire (-) ve nokta (.) karakterlerini de içeriyor.
        // Örn: @ali-veli, @ahmet.yilmaz
        if ( preg_match_all( '/@([\w\-\.\u00C0-\u017F]+)/u', $content, $matches ) ) {
            $usernames = array_unique( $matches[1] );
            $mentioned_ids = [];

            foreach ( $usernames as $username ) {
                $user = get_user_by( 'login', $username );
                
                if ( ! $user ) {
                    // Slug araması (display_name araması yerine slug daha güvenilir olabilir)
                    $user = get_user_by( 'slug', $username );
                }

                if ( ! $user ) {
                    // Son çare display_name araması
                    $users = get_users( array(
                        'search'         => $username,
                        'search_columns' => array( 'display_name' ),
                        'number'         => 1
                    ) );
                    if ( ! empty( $users ) ) {
                        $user = $users[0];
                    }
                }

                if ( $user ) {
                    $mentioned_ids[] = $user->ID;
                }
            }

            if ( ! empty( $mentioned_ids ) && class_exists('H2L_Reminder') ) {
                $reminder = new H2L_Reminder();
                $reminder->send_mention_notification( $task_id, $mentioned_ids, $content );
            }
        }
    }

    public function update( $id, $content ) {
        global $wpdb;
        $data = array( 'content' => wp_kses_post( $content ) );
        $updated = $wpdb->update( $this->table, $data, array( 'id' => $id ), array( '%s' ), array( '%d' ) );
        return $updated !== false ? $this->get( $id ) : false;
    }

    public function get_by_task( $task_id ) {
        global $wpdb;
        $sql = "SELECT * FROM {$this->table} WHERE task_id = %d ORDER BY created_at ASC";
        return $wpdb->get_results( $wpdb->prepare( $sql, $task_id ) );
    }

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