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

        $format = array( '%d', '%s', '%d', '%s', '%d' );
        
        $inserted = $wpdb->insert( $this->table, $args, $format );

        if ( $inserted ) {
            return $wpdb->insert_id;
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

        $sql .= " ORDER BY created_at DESC";

        return $wpdb->get_results( $sql );
    }
}
?>