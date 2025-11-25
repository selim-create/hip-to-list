<?php
/**
 * Görev (Task) nesnesi için CRUD işlemleri.
 */

class H2L_Task {

    private $table;

    public function __construct() {
        $this->table = h2l_get_table_name('tasks');
    }

    /**
     * Yeni Görev Ekle
     */
    public function create( $data ) {
        global $wpdb;

        $defaults = array(
            'project_id' => 0,
            'title'      => '',
            'priority'   => 4,
            'status'     => 'open',
            'assignee_id'=> get_current_user_id()
        );

        $args = wp_parse_args( $data, $defaults );

        // Doğal dil işlemesi burada tetiklenebilir
        // $args['due_date'] = h2l_parse_due_date($args['title']);

        // Not: $args içindeki anahtarlar tablo kolonları ile eşleşmeli
        $inserted = $wpdb->insert( $this->table, $args );

        if ( $inserted ) {
            $id = $wpdb->insert_id;
            if ( class_exists('H2L_Activity') ) {
                H2L_Activity::log('task', $id, 'created');
            }
            return $id;
        }
        return false;
    }

    /**
     * Görevleri Getir
     */
    public function get_tasks( $filters = array() ) {
        global $wpdb;
        
        $sql = "SELECT * FROM {$this->table} WHERE 1=1";
        
        if ( isset( $filters['project_id'] ) ) {
            $sql .= $wpdb->prepare( " AND project_id = %d", $filters['project_id'] );
        }
        
        if ( isset( $filters['status'] ) ) {
             $sql .= $wpdb->prepare( " AND status = %s", $filters['status'] );
        }

        $sql .= " ORDER BY created_at ASC";

        return $wpdb->get_results( $sql );
    }

    /**
     * Tekrarlı Görev Tamamlandığında Çalışır
     * Bir sonraki tarihi hesaplar ve yeni görev oluşturur.
     */
    public function handle_recurring_completion( $task ) {
        global $wpdb;

        if ( empty($task->recurrence_rule) || empty($task->due_date) ) {
            return false;
        }

        $next_date = $this->calculate_next_occurrence( $task->due_date, $task->recurrence_rule );
        
        if ( ! $next_date ) {
            return false;
        }

        // Yeni Görev Verisi (Clone)
        $new_task_data = array(
            'title'               => $task->title,
            'content'             => $task->content,
            'project_id'          => $task->project_id,
            'section_id'          => $task->section_id,
            'parent_task_id'      => $task->parent_task_id,
            'priority'            => $task->priority,
            'status'              => 'in_progress', // Yeni görev açık
            'due_date'            => $next_date,
            'recurrence_rule'     => $task->recurrence_rule, // Kuralı koru
            'assignee_ids'        => $task->assignee_ids,
            'related_object_type' => $task->related_object_type,
            'related_object_id'   => $task->related_object_id,
            'reminder_enabled'    => $task->reminder_enabled,
            'reminder_sent'       => 0,
            'created_at'          => current_time('mysql')
        );

        $wpdb->insert( $this->table, $new_task_data );
        $new_id = $wpdb->insert_id;

        if ( $new_id && class_exists('H2L_Activity') ) {
            H2L_Activity::log('task', $new_id, 'created', ['from_recurrence' => $task->id]);
        }

        return $new_id;
    }

    /**
     * Bir sonraki tarihi hesapla
     */
    private function calculate_next_occurrence( $current_date_str, $rule ) {
        $current_ts = strtotime( $current_date_str );
        $now_ts = current_time( 'timestamp' );
        
        // Eğer görev gecikmişse, bugünden itibaren hesapla (Todoist mantığı)
        // Yoksa son tarihten itibaren hesapla.
        // Basitlik için son tarihten itibaren hesaplıyoruz.
        
        $base_ts = $current_ts;

        switch ( $rule ) {
            case 'daily':
                return date( 'Y-m-d H:i:s', strtotime( '+1 day', $base_ts ) );
            case 'weekly':
                return date( 'Y-m-d H:i:s', strtotime( '+1 week', $base_ts ) );
            case 'monthly':
                return date( 'Y-m-d H:i:s', strtotime( '+1 month', $base_ts ) );
            case 'yearly':
                return date( 'Y-m-d H:i:s', strtotime( '+1 year', $base_ts ) );
            default:
                return null;
        }
    }
}
?>