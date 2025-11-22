<?php
/**
 * Aktivite Günlüğü (Audit Log) İşlemleri
 */

class H2L_Activity {
    private $table;

    public function __construct() {
        $this->table = h2l_get_table_name('activity_log');
    }

    /**
     * Log Kaydet
     * Örn: H2L_Activity::log('task', 123, 'completed', ['old_status'=>'open']);
     */
    public static function log( $object_type, $object_id, $action, $meta = [] ) {
        global $wpdb;
        $table = h2l_get_table_name('activity_log');
        
        $user_id = get_current_user_id();
        
        // Sistem tarafından yapılan işlemler için (örn: cron) user_id 0 olabilir veya kontrol edilebilir
        if( ! $user_id && doing_action('h2l_daily_reminder_check') ) {
            $user_id = 0; // System
        }

        $data = array(
            'object_type' => $object_type,
            'object_id'   => $object_id,
            'actor_id'    => $user_id,
            'action'      => $action,
            'meta_json'   => !empty($meta) ? json_encode($meta) : null,
            'created_at'  => current_time( 'mysql' )
        );

        $wpdb->insert( $table, $data, array( '%s', '%d', '%d', '%s', '%s', '%s' ) );
    }

    /**
     * Bir nesneye ait logları getir (Örn: Bir görevin geçmişi)
     */
    public function get_logs( $object_type, $object_id ) {
        global $wpdb;
        
        // User tablosuyla join yaparak ismi alalım
        $sql = "SELECT a.*, u.display_name as actor_name, u.user_email 
                FROM {$this->table} a 
                LEFT JOIN {$wpdb->users} u ON a.actor_id = u.ID
                WHERE a.object_type = %s AND a.object_id = %d 
                ORDER BY a.created_at DESC";
                
        return $wpdb->get_results( $wpdb->prepare( $sql, $object_type, $object_id ) );
    }

    /**
     * Log mesajını insan tarafından okunabilir hale getir
     */
    public static function format_message( $log ) {
        $actor = $log->actor_id == 0 ? 'Sistem' : ($log->actor_name ?? 'Bilinmeyen');
        $meta = !empty($log->meta_json) ? json_decode($log->meta_json, true) : [];

        switch ( $log->action ) {
            case 'created':
                return "{$actor} görevi oluşturdu.";
            case 'completed':
                return "{$actor} görevi tamamladı.";
            case 'reopened':
                return "{$actor} görevi tekrar açtı.";
            case 'updated':
                // Meta içinde neyin değiştiği varsa detaylandırılabilir
                if( isset($meta['changed_fields']) ) {
                    $fields = implode(', ', array_map(function($f){
                        $map = ['title'=>'Başlık', 'due_date'=>'Tarih', 'priority'=>'Öncelik', 'section_id'=>'Bölüm'];
                        return $map[$f] ?? $f;
                    }, $meta['changed_fields']));
                    return "{$actor} güncelledi: {$fields}.";
                }
                return "{$actor} görevi güncelledi.";
            case 'comment_added':
                return "{$actor} yorum yaptı.";
            case 'assigned':
                return "{$actor} atama yaptı."; // Kime atandığı meta'dan çekilebilir
            default:
                return "{$actor} bir işlem yaptı: {$log->action}";
        }
    }
}
?>