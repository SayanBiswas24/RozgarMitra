import 'package:beneficiary_app/l10n/app_localizations.dart';
import 'package:beneficiary_app/theme/app_colors.dart';
import 'package:flutter/material.dart';

class AssistantScreen extends StatefulWidget {
  const AssistantScreen({super.key});

  @override
  State<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends State<AssistantScreen> {
  bool _isListening = false;

  void _toggleListening() {
    setState(() {
      _isListening = !_isListening;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    final messages = [
      ChatMessage(
        message: l10n?.saathiGreeting1 ??
            'Namaste! I am Saathi. I can help you find suitable skills, '
            'training and livelihood opportunities.',
        isAssistant: true,
      ),
      ChatMessage(
        message: l10n?.saathiGreeting2 ??
            'Let us start by understanding what kind of work you are '
            'interested in.',
        isAssistant: true,
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: primaryColor.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.support_agent_rounded,
                color: primaryColor,
                size: 23,
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n?.saathi ?? 'Saathi',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
                Text(
                  l10n?.livelihoodAssistant ?? 'Your livelihood assistant',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.normal,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),

      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
              itemCount: messages.length,
              itemBuilder: (context, index) {
                final message = messages[index];
                return _ChatBubble(message: message);
              },
            ),
          ),

          _buildListeningArea(context, l10n),
        ],
      ),
    );
  }

  Widget _buildListeningArea(BuildContext context, AppLocalizations? l10n) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    return Container(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          top: BorderSide(color: theme.colorScheme.outlineVariant),
        ),
      ),
      child: Column(
        children: [
          Text(
            _isListening
                ? (l10n?.listening ?? 'Listening...')
                : (l10n?.tapMicrophone ?? 'Tap the microphone and speak'),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w500,
            ),
          ),

          const SizedBox(height: 14),

          GestureDetector(
            onTap: _toggleListening,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: _isListening ? 86 : 76,
              height: _isListening ? 86 : 76,
              decoration: BoxDecoration(
                color: _isListening ? AppColors.primaryDark : primaryColor,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: primaryColor.withValues(alpha: 0.25),
                    blurRadius: _isListening ? 20 : 12,
                    spreadRadius: _isListening ? 5 : 2,
                  ),
                ],
              ),
              child: Icon(
                _isListening ? Icons.stop_rounded : Icons.mic_rounded,
                color: isDark ? Colors.black : Colors.white,
                size: 34,
              ),
            ),
          ),

          const SizedBox(height: 12),

          Text(
            _isListening
                ? (l10n?.tapAgainToFinish ?? 'Tap again when you are finished')
                : (l10n?.speakNaturallyNotice ??
                    'You can speak naturally in your selected language'),
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  final ChatMessage message;

  const _ChatBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;
    final isAssistant = message.isAssistant;

    return Align(
      alignment: isAssistant ? Alignment.centerLeft : Alignment.centerRight,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.82,
        ),
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isAssistant
              ? theme.colorScheme.surface
              : primaryColor,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(isAssistant ? 4 : 18),
            bottomRight: Radius.circular(isAssistant ? 18 : 4),
          ),
          border: isAssistant
              ? Border.all(color: theme.colorScheme.outlineVariant)
              : null,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isAssistant) ...[
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: primaryColor.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.support_agent_rounded,
                  size: 17,
                  color: primaryColor,
                ),
              ),
              const SizedBox(width: 10),
            ],
            Expanded(
              child: Text(
                message.message,
                style: TextStyle(
                  fontSize: 16,
                  height: 1.45,
                  color: isAssistant
                      ? theme.colorScheme.onSurface
                      : (isDark ? Colors.black : Colors.white),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ChatMessage {
  final String message;
  final bool isAssistant;

  const ChatMessage({required this.message, required this.isAssistant});
}
