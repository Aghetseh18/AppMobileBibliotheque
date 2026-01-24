import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import React from 'react'
import { useTranslation } from '../../hooks/useTranslation';

const FichePaie = () => {
  const { t } = useTranslation();

  const [text, onChangeText] = React.useState('')
  const [lieu, onChangeLieu] = React.useState('')
  const [number, onChangeNumber] = React.useState(null);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{}}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', backgroundColor: 'gray' }}>
            <Text style={{ fontWeight: '700', fontSize: 35, }}> {t('payment_shein_text')}</Text>
            <Text style={{ fontSize: 10, marginTop: 23 }}>CM</Text>
          </View>

          <View style={{ backgroundColor: '#A0A0A0' }}>
            <Text style={{ textAlign: 'center' }}>{t('payment_reduction_text')}</Text>
          </View>

          <View style={{ justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'Georgia', textAlign: 'center', textDecorationLine: 'underline', textDecorationColor: '#000', textDecorationStyle: 'solid', fontSize: 19, fontWeight: '600', marginTop: 10 }}>{t('payment_secure_text')}</Text>
            <Text style={{ textDecorationLine: 'underline', color: '#000' }}></Text>
          </View>




          <View style={{ margin: 7, flexDirection: 'row' }}>
            <Text style={{ color: 'gray', marginTop: 5 }}>{t('payment_location_label')}</Text>
            <TextInput
              style={styles.inputLieu}
              onChangeText={onChangeLieu}
              value={lieu}
              placeholder={t('quartier_placeholder')}
            />
          </View>

          <View>
            <View style={{ marginTop: 30 }}>
              <TextInput
                style={styles.input}
                onChangeText={onChangeText}
                value={text}
                placeholder={t('account_name_placeholder')}
              />
            </View>

            <View>
              <TextInput
                style={styles.input}
                onChangeText={onChangeNumber}
                value={number}
                placeholder={t('phone_number_placeholder')}
                keyboardType="numeric"
              />
            </View>
          </View>
          <TouchableOpacity style={{ backgroundColor: '#000', height: 40, width: 200, alignSelf: 'center' }}>
            <Text style={{ color: '#fff', textAlign: 'center', marginTop: 10, fontSize: 20, fontWeight: '800' }}>{t('validate_btn')}</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  input: {
    height: 40,
    margin: 12,
    borderWidth: 0.7,
    padding: 10,
    borderColor: 'gray',
    width: 290,
    alignSelf: 'center'
  },
  inputLieu: {
    height: 25,

    borderWidth: 0.7,

    borderColor: 'gray',
    width: 100,

  }
})

export default FichePaie