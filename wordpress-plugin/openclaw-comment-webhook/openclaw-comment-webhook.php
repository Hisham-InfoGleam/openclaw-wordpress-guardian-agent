<?php
/**
 * Plugin Name: OpenClaw Comment Webhook
 * Description: Sends signed WordPress comment events to OpenClaw automation API.
 * Version: 0.1.0
 * Author: OpenClaw Guardian
 */

if (!defined('ABSPATH')) {
    exit;
}

const OPENC_CW_OPTION_ENDPOINT = 'openclaw_cw_endpoint';
const OPENC_CW_OPTION_SECRET = 'openclaw_cw_secret';

add_action('admin_menu', function () {
    add_options_page(
        'OpenClaw Comment Webhook',
        'OpenClaw Webhook',
        'manage_options',
        'openclaw-comment-webhook',
        'openclaw_cw_render_settings_page'
    );
});

add_action('admin_init', function () {
    register_setting('openclaw_cw_settings', OPENC_CW_OPTION_ENDPOINT, [
        'type' => 'string',
        'sanitize_callback' => function ($value) {
            return esc_url_raw(trim((string) $value));
        },
        'default' => '',
    ]);

    register_setting('openclaw_cw_settings', OPENC_CW_OPTION_SECRET, [
        'type' => 'string',
        'sanitize_callback' => function ($value) {
            return trim((string) $value);
        },
        'default' => '',
    ]);

    add_settings_section(
        'openclaw_cw_main',
        'Webhook Configuration',
        function () {
            echo '<p>Configure where WordPress sends signed comment events.</p>';
        },
        'openclaw-comment-webhook'
    );

    add_settings_field(
        OPENC_CW_OPTION_ENDPOINT,
        'Automation API Webhook URL',
        function () {
            $value = esc_attr((string) get_option(OPENC_CW_OPTION_ENDPOINT, ''));
            echo '<input type="url" name="' . esc_attr(OPENC_CW_OPTION_ENDPOINT) . '" value="' . $value . '" class="regular-text" placeholder="https://your-api.example.com/hooks/wp-comment" required />';
        },
        'openclaw-comment-webhook',
        'openclaw_cw_main'
    );

    add_settings_field(
        OPENC_CW_OPTION_SECRET,
        'Webhook Shared Secret',
        function () {
            $value = esc_attr((string) get_option(OPENC_CW_OPTION_SECRET, ''));
            echo '<input type="password" name="' . esc_attr(OPENC_CW_OPTION_SECRET) . '" value="' . $value . '" class="regular-text" autocomplete="new-password" required />';
            echo '<p class="description">Must match WEBHOOK_SHARED_SECRET in automation-api.</p>';
        },
        'openclaw-comment-webhook',
        'openclaw_cw_main'
    );
});

function openclaw_cw_render_settings_page()
{
    if (!current_user_can('manage_options')) {
        return;
    }
    ?>
    <div class="wrap">
        <h1>OpenClaw Comment Webhook</h1>
        <form action="options.php" method="post">
            <?php
            settings_fields('openclaw_cw_settings');
            do_settings_sections('openclaw-comment-webhook');
            submit_button('Save Settings');
            ?>
        </form>
    </div>
    <?php
}

add_action('comment_post', function ($comment_ID, $comment_approved) {
    $endpoint = (string) get_option(OPENC_CW_OPTION_ENDPOINT, '');
    $secret = (string) get_option(OPENC_CW_OPTION_SECRET, '');

    if ($endpoint === '' || $secret === '') {
        return;
    }

    if ((string) $comment_approved === 'spam' || (string) $comment_approved === 'trash') {
        return;
    }

    $comment = get_comment($comment_ID);
    if (!$comment) {
        return;
    }

    $site_host = wp_parse_url(home_url(), PHP_URL_HOST);
    $payload = [
        'event' => 'wp.comment.created',
        'eventId' => wp_generate_uuid4(),
        'site' => $site_host ?: 'wordpress-site',
        'comment' => [
            'id' => (int) $comment->comment_ID,
            'postId' => (int) $comment->comment_post_ID,
            'authorName' => (string) $comment->comment_author,
            'authorUrl' => $comment->comment_author_url !== '' ? (string) $comment->comment_author_url : null,
            'content' => (string) $comment->comment_content,
            'createdAt' => gmdate('c', strtotime((string) $comment->comment_date_gmt ?: 'now')),
        ],
    ];

    $body = wp_json_encode($payload);
    if (!is_string($body) || $body === '') {
        return;
    }

    $signature = hash_hmac('sha256', $body, $secret);

    wp_remote_post($endpoint, [
        'method' => 'POST',
        'timeout' => 2,
        'blocking' => false,
        'headers' => [
            'Content-Type' => 'application/json',
            'X-WP-Signature' => 'sha256=' . $signature,
        ],
        'body' => $body,
    ]);
}, 10, 2);
