<?php
/**
 * Toplantı (Meeting) Yönetimi ve OpenAI Entegrasyonu
 */

class H2L_Meeting {
    private $table;

    public function __construct() {
        global $wpdb;
        $this->table = $wpdb->prefix . 'h2l_meetings';
    }

    /**
     * Toplantı Başlat
     */
    public function start( $title, $rel_type = '', $rel_id = 0 ) {
        global $wpdb;
        
        $data = array(
            'title'               => sanitize_text_field( $title ),
            'related_object_type' => sanitize_text_field( $rel_type ),
            'related_object_id'   => intval( $rel_id ),
            'created_by'          => get_current_user_id(),
            'created_at'          => current_time( 'mysql' ),
            'status'              => 'in_progress',
            'language'            => 'tr'
        );

        $wpdb->insert( $this->table, $data );
        return $wpdb->insert_id;
    }

    /**
     * Toplantıyı Bitir ve Analiz Et
     */
    public function finish( $id, $transcript, $duration, $language = 'tr' ) {
        global $wpdb;
        
        // 1. Ayarları Getir
        $api_key = get_option('h2l_openai_api_key');
        $model   = get_option('h2l_meeting_model', 'gpt-4o-mini');

        $analysis = [];

        // 2. API Anahtarı varsa OpenAI'a sor
        if ( ! empty( $api_key ) ) {
            $analysis = $this->analyze_with_openai( $transcript, $api_key, $model, $language );
        } 
        
        // 3. Analiz başarısızsa veya anahtar yoksa varsayılan değer döndür
        if ( empty($analysis) ) {
             $analysis = [
                 'summary' => 'Özet oluşturulamadı. Lütfen Ayarlar > API & Toplantı sekmesinden geçerli bir OpenAI API anahtarı girdiğinizden emin olun.',
                 'actions' => [],
                 'decisions' => []
             ];
             
             // Geliştirme ortamı için Mock data (Opsiyonel, API key yoksa test için)
             if ( defined('WP_DEBUG') && WP_DEBUG ) {
                 $analysis['summary'] .= " (Debug Modu: Mock veri yükleniyor...)";
                 $analysis['actions'][] = ['title' => 'API Anahtarı Eksik - Ayarları Kontrol Et', 'assignee_hint' => 'Admin', 'due_hint' => 'Bugün'];
             }
        }

        $data = array(
            'transcript'       => $transcript, // İleride HTML temizliği yapılabilir
            'summary'          => $analysis['summary'],
            'actions_json'     => json_encode( $analysis['actions'] ),
            'decisions_json'   => json_encode( $analysis['decisions'] ),
            'duration_seconds' => intval( $duration ),
            'language'         => sanitize_text_field( $language ),
            'status'           => 'completed'
        );

        $wpdb->update( $this->table, $data, array( 'id' => $id ) );
        
        return $this->get( $id );
    }

    /**
     * Toplantı Detayını Getir
     */
    public function get( $id ) {
        global $wpdb;
        $meeting = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$this->table} WHERE id = %d", $id ) );
        
        if ( $meeting ) {
            if ( !empty($meeting->related_object_id) && !empty($meeting->related_object_type) ) {
                $post = get_post( $meeting->related_object_id );
                $meeting->related_object_title = $post ? $post->post_title : 'Silinmiş Kayıt';
            } else {
                $meeting->related_object_title = '';
            }
        }
        return $meeting;
    }

    public function get_all( $user_id ) {
        global $wpdb;
        return $wpdb->get_results( $wpdb->prepare( 
            "SELECT id, title, created_at, duration_seconds, related_object_type, related_object_id, status 
             FROM {$this->table} 
             WHERE created_by = %d AND deleted_at IS NULL 
             ORDER BY created_at DESC", 
            $user_id 
        ));
    }

    /**
     * OpenAI API İsteği
     */
    private function analyze_with_openai( $transcript, $api_key, $model, $language ) {
        // Token limitini aşmamak için transkripti sınırla (model gpt-4o-mini ise 128k context var ama output ve maliyet için kısalım)
        $clean_transcript = substr( strip_tags($transcript), 0, 30000 ); 

        $prompt = "Aşağıdaki toplantı transkriptini analiz et ve JSON formatında yanıt ver.\n\n";
        $prompt .= "Transkript:\n" . $clean_transcript . "\n\n";
        $prompt .= "İstenen JSON Formatı:\n";
        $prompt .= "{\n";
        $prompt .= '  "summary": "Toplantının kapsamlı, madde işaretli özeti (Markdown kullanılabilir).",'."\n";
        $prompt .= '  "decisions": ["Alınan karar 1", "Alınan karar 2"],'."\n";
        $prompt .= '  "actions": ['."\n";
        $prompt .= '    { "title": "Görev başlığı (kısa ve net aksiyon)", "assignee_hint": "Konuşmada adı geçen kişi veya unvan", "due_hint": "Zaman/Tarih ifadesi (örn: yarına kadar)" }'."\n";
        $prompt .= "  ]\n";
        $prompt .= "}\n";
        $prompt .= "Yanıt dili: " . ($language === 'tr' ? "Türkçe" : "İngilizce") . ".";

        $body = [
            'model' => $model,
            'messages' => [
                ['role' => 'system', 'content' => 'Sen profesyonel bir toplantı asistanısın. Toplantı notlarını yapılandırılmış JSON verisine dönüştürürsün.'],
                ['role' => 'user', 'content' => $prompt]
            ],
            'response_format' => ['type' => 'json_object'], // JSON modunu zorla
            'temperature' => 0.3, // Daha tutarlı sonuçlar için düşük sıcaklık
            'max_tokens' => 2000
        ];

        $response = wp_remote_post( 'https://api.openai.com/v1/chat/completions', [
            'headers' => [
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type'  => 'application/json'
            ],
            'body'    => json_encode( $body ),
            'timeout' => 60 // OpenAI analizi bazen uzun sürebilir
        ]);

        if ( is_wp_error( $response ) ) {
            error_log( 'H2L OpenAI Bağlantı Hatası: ' . $response->get_error_message() );
            return null;
        }

        $response_body = wp_remote_retrieve_body( $response );
        $data = json_decode( $response_body, true );

        if ( isset( $data['error'] ) ) {
            error_log( 'H2L OpenAI API Hatası: ' . $data['error']['message'] );
            return null;
        }

        if ( isset( $data['choices'][0]['message']['content'] ) ) {
            $content = $data['choices'][0]['message']['content'];
            $json = json_decode( $content, true );
            
            // JSON ayrıştırma hatası kontrolü
            if ( json_last_error() === JSON_ERROR_NONE ) {
                return $json;
            } else {
                error_log( 'H2L OpenAI JSON Parse Hatası: ' . json_last_error_msg() );
            }
        }

        return null;
    }
}
?>