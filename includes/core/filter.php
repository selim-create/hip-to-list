<?php
/**
 * Filtre (Kaydedilmiş Aramalar) Yönetimi
 */

class H2L_Filter {
    private $table;

    public function __construct() {
        global $wpdb;
        $this->table = $wpdb->prefix . 'h2l_filters';
    }

    /**
     * Yeni Filtre Oluştur
     */
    public function create( $title, $query, $user_id = null ) {
        global $wpdb;
        
        if ( ! $user_id ) {
            $user_id = get_current_user_id();
        }

        $data = array(
            'title'      => sanitize_text_field( $title ),
            'user_id'    => $user_id,
            'query_json' => is_array($query) ? json_encode($query) : $query, // JSON formatında sakla
            'is_shared'  => 0,
            'created_at' => current_time( 'mysql' )
        );

        $inserted = $wpdb->insert( $this->table, $data, array( '%s', '%d', '%s', '%d', '%s' ) );

        if ( $inserted ) {
            return $this->get( $wpdb->insert_id );
        }
        return false;
    }

    /**
     * Filtreyi Getir
     */
    public function get( $id ) {
        global $wpdb;
        return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$this->table} WHERE id = %d", $id ) );
    }

    /**
     * Kullanıcının Filtrelerini Getir
     */
    public function get_user_filters( $user_id ) {
        global $wpdb;
        return $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$this->table} WHERE user_id = %d AND deleted_at IS NULL ORDER BY created_at DESC", $user_id ) );
    }

    /**
     * Filtreyi Sil (Soft Delete)
     */
    public function delete( $id ) {
        global $wpdb;
        $user_id = get_current_user_id();
        // Sadece kendi filtresini silebilir
        return $wpdb->update( 
            $this->table, 
            array( 'deleted_at' => current_time('mysql') ), 
            array( 'id' => $id, 'user_id' => $user_id ),
            array( '%s' ),
            array( '%d', '%d' )
        );
    }
}
?>