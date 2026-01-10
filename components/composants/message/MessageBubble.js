import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons as Icon } from '@expo/vector-icons';

const WIDTH = Dimensions.get('window').width;

const MessageBubble = ({ message, time, isReceived, isLast, isRead }) => {
  const containerStyle = [
    styles.messageContainer,
    isReceived ? styles.receivedContainer : styles.sentContainer,
    !isLast && styles.notLastMessage
  ];

  const bubbleContent = (
    <>
      <Text style={[styles.messageText, isReceived ? styles.receivedText : styles.sentText]}>
        {message}
      </Text>
      <Text style={[styles.timeText, isReceived ? styles.receivedTime : styles.sentTime]}>
        {time}
      </Text>
      {!isReceived && (
        <View style={styles.readReceipt}>
          <Icon
            name={isRead ? "done-all" : "done"}
            size={16}
            color={isRead ? '#3498db' : '#999'}
          />
        </View>
      )}
    </>
  );

  if (isReceived) {
    return (
      <View style={containerStyle}>
        <View style={[styles.messageBubble, styles.receivedBubble]}>
          {bubbleContent}
        </View>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <LinearGradient
        colors={['#FF6600', '#FF6600']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.messageBubble, styles.sentBubble]}
      >
        {bubbleContent}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    paddingHorizontal: 12,
    marginVertical: 2,
    maxWidth: WIDTH * 0.8,
  },
  sentContainer: {
    alignSelf: 'flex-end',
  },
  receivedContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  sentBubble: {
    borderTopRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 4,
  },
  notLastMessage: {
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    flexShrink: 1,
  },
  sentText: {
    color: '#fff',
  },
  receivedText: {
    color: '#1F2937',
  },
  timeText: {
    fontSize: 11,
    flexShrink: 0,
  },
  sentTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  receivedTime: {
    color: '#6B7280',
  },
  readReceipt: {
    marginLeft: 4,
  },
});

export default MessageBubble;
