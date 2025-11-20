<?php
class H2L_Folder {
    private $table;

    public function __construct() {
        global $wpdb;
        // Helper fonksiyon yerine manuel prefix veya global tanımla
        // Hata riskini azaltmak için doğrudan wpdb->prefix kullanıyoruz
        $this->table = $wpdb->prefix . 'h2l_folders';
    }

    public function create( $data ) {
        global $wpdb;
        
        if ( empty( $data['slug'] ) ) {
            $data['slug'] = sanitize_title( $data['name'] );
        }

        $defaults = array(
            'description' => '',
            'access_type' => 'private',
            'owner_id'    => get_current_user_id()
        );

        $data = wp_parse_args( $data, $defaults );

        return $wpdb->insert( $this->table, $data );
    }

    public function get_all( $args = array() ) {
        global $wpdb;
        $sql = "SELECT * FROM {$this->table} WHERE 1=1";

        if( isset($args['owner_id']) ) {
             $sql .= $wpdb->prepare(" AND owner_id = %d", $args['owner_id']);
        }

        return $wpdb->get_results( $sql );
    }
    
    public function delete( $id ) {
        global $wpdb;
        return $wpdb->delete( $this->table, array( 'id' => $id ) );
    }
}
?>