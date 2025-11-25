<?php
/**
 * iCal Feed Generator
 * Görevleri .ics formatında dışarı aktarır.
 */

class H2L_iCal {

    /**
     * Feed'i Oluştur ve Çıktıla
     */
    public function generate_feed( $token ) {
        global $wpdb;

        // 1. Token Doğrulama
        // Token 'uid|secret' formatında olmalıdır veya user_meta'da saklanmalıdır.
        // Basitlik ve güvenlik için token'ı user meta'da arayacağız.
        
        $user_id = 0;
        $users = get_users( ['meta_key' => 'h2l_ical_token', 'meta_value' => $token, 'number' => 1] );
        
        if ( ! empty($users) ) {
            $user_id = $users[0]->ID;
        }

        if ( ! $user_id ) {
            wp_die( 'Geçersiz Takvim URL\'si (Token hatalı). Lütfen Ayarlar sayfasından yeni bir URL alın.', 'H2L iCal Error', ['response' => 403] );
        }

        // 2. Görevleri Getir (Sadece açık ve gelecekteki görevler)
        // Geçmiş 30 gün + Gelecek 1 yıl
        $start_range = date( 'Y-m-d 00:00:00', strtotime( '-30 days' ) );
        $end_range   = date( 'Y-m-d 23:59:59', strtotime( '+1 year' ) );

        $table_tasks = h2l_get_table_name( 'tasks' );
        $table_projects = h2l_get_table_name( 'projects' );

        // Kullanıcının atandığı veya sahibi olduğu görevler (Atama mantığı JSON olduğu için LIKE kullanıyoruz, idealde relation tablosu olmalıydı ama v1.0 yapısı bu)
        // JSON içinde ID aramak için: %"ID"%
        $user_id_str = '"' . $user_id . '"';
        
        $sql = $wpdb->prepare(
            "SELECT t.*, p.title as project_title 
             FROM {$table_tasks} t 
             LEFT JOIN {$table_projects} p ON t.project_id = p.id
             WHERE t.status != 'trash' AND t.status != 'completed'
             AND (t.assignee_ids LIKE %s)
             AND t.due_date BETWEEN %s AND %s
             ORDER BY t.due_date ASC",
             '%' . $wpdb->esc_like( $user_id_str ) . '%',
             $start_range,
             $end_range
        );

        $tasks = $wpdb->get_results( $sql );

        // 3. ICS Çıktısı Başlat
        header( 'Content-Type: text/calendar; charset=utf-8' );
        header( 'Content-Disposition: attachment; filename="hip-to-list-tasks.ics"' );

        echo "BEGIN:VCALENDAR\r\n";
        echo "VERSION:2.0\r\n";
        echo "PRODID:-//HipMedia//HipToList v1.1//TR\r\n";
        echo "CALSCALE:GREGORIAN\r\n";
        echo "METHOD:PUBLISH\r\n";
        echo "X-WR-CALNAME:Hip to List Görevler\r\n";
        echo "X-WR-TIMEZONE:Europe/Istanbul\r\n";

        foreach ( $tasks as $task ) {
            if ( empty( $task->due_date ) ) continue;

            $dt_start = date( 'Ymd\THis', strtotime( $task->due_date ) );
            // Bitiş saati yoksa 1 saat ekle
            $dt_end   = date( 'Ymd\THis', strtotime( $task->due_date . ' +1 hour' ) );
            
            $uid = 'h2l-' . $task->id . '@' . $_SERVER['HTTP_HOST'];
            $summary = $this->escape_ical_text( $task->title );
            $description = $this->escape_ical_text( strip_tags( $task->content ) );
            
            if ( !empty($task->project_title) ) {
                $description = "Proje: " . $this->escape_ical_text($task->project_title) . "\\n" . $description;
            }
            
            $url = site_url( '/gorevler/gorev/' . $task->id );

            echo "BEGIN:VEVENT\r\n";
            echo "UID:{$uid}\r\n";
            echo "DTSTART:{$dt_start}\r\n";
            echo "DTEND:{$dt_end}\r\n";
            echo "DTSTAMP:" . gmdate( 'Ymd\THis\Z' ) . "\r\n";
            echo "SUMMARY:{$summary}\r\n";
            echo "DESCRIPTION:{$description}\\n\\nLink: {$url}\r\n";
            echo "URL:{$url}\r\n";
            if ( !empty($task->priority) && $task->priority == 1 ) {
                echo "PRIORITY:1\r\n"; // Yüksek
            }
            echo "STATUS:CONFIRMED\r\n";
            echo "END:VEVENT\r\n";
        }

        echo "END:VCALENDAR";
        exit;
    }

    private function escape_ical_text( $text ) {
        $text = str_replace( "\\", "\\\\", $text );
        $text = str_replace( ",", "\,", $text );
        $text = str_replace( ";", "\;", $text );
        $text = str_replace( "\n", "\\n", $text );
        return $text;
    }
    
    /**
     * Kullanıcı için Token Oluştur veya Getir
     */
    public static function get_user_token( $user_id ) {
        $token = get_user_meta( $user_id, 'h2l_ical_token', true );
        if ( empty( $token ) ) {
            $token = wp_generate_password( 32, false );
            update_user_meta( $user_id, 'h2l_ical_token', $token );
        }
        return $token;
    }
}
?>