import { View, Text, SafeAreaView, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import React, { useEffect, useState, useContext } from 'react';
import BigRect from '../BigRect';
import { UserContextNavApp } from '../../navigation/NavApp';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../../config';
import { useTranslation } from '../../hooks/useTranslation';

const WIDTH = Dimensions.get('window').height;

const Cathegorie = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { cathegorie, isMemoire } = route.params || {};
  const { currentUserdata } = useContext(UserContextNavApp) || {};
  const [data, setData] = useState([]);
  const [loader, setLoader] = useState(true);

  useEffect(() => {
    if (!currentUserdata?.email) {
      setLoader(false);
      return;
    }

    const loadData = async () => {
      try {
        let allItems = [];

        // Déterminer si c'est une catégorie de mémoires
        // Support explicit prop OR legacy string check
        const isMemoireCategory = isMemoire === true || (cathegorie && cathegorie.toLowerCase().includes('memoire'));

        if (isMemoireCategory) {
          // Charger depuis la collection Memoire
          console.log('Chargement des mémoires pour la catégorie:', cathegorie);
          const memoireQuery = query(collection(db, "BiblioThesis"));
          const memoireSnapshot = await getDocs(memoireQuery);

          memoireSnapshot.forEach((doc) => {
            const data = doc.data();
            allItems.push({
              ...data,
              id: doc.id,
              type: 'memoire'
            });
          });

          // Filtrer par catégorie de mémoire
          if (cathegorie && cathegorie !== 'Memoire') {
            // Mapping des catégories de mémoires vers les départements (Legacy)
            const categoryMap = {
              'Memoire GI': 'Genie Informatique',
              'Memoire GC': 'Genie Civil',
              'Memoire GM': 'Genie Mecanique',
              'Memoire GInd': 'Genie Industriel',
              'Memoire GEle': 'Genie Electrique',
              'Memoire GTel': 'Genie Telecom'
            };

            // Use mapped department OR raw category name
            const targetDepartment = categoryMap[cathegorie] || cathegorie;

            console.log(`Filtrage pour ${cathegorie} -> département: ${targetDepartment}`);

            if (targetDepartment) {
              allItems = allItems.filter(item => {
                const itemDept = item.département || item.departement || item.cathegorie; // Fallback to cathegorie field if dept missing
                // Case insensitive check just in case
                const matches = itemDept && itemDept.toLowerCase() === targetDepartment.toLowerCase();
                return matches;
              });
            }
          }

          console.log(`${allItems.length} mémoires trouvés après filtrage pour ${cathegorie}`);

        } else {
          // Charger depuis BiblioInformatique pour les livres normaux
          console.log('Chargement des livres pour la catégorie:', cathegorie);

          // Charger depuis toutes les collections pertinentes
          const collections = ['BiblioBooks'];

          for (const collectionName of collections) {
            try {
              const q = query(collection(db, collectionName), orderBy("name", "asc"));
              const querySnapshot = await getDocs(q);

              querySnapshot.forEach((doc) => {
                const data = doc.data();
                allItems.push({
                  ...data,
                  id: doc.id,
                  collection: collectionName,
                  type: 'livre'
                });
              });
            } catch (error) {
              console.error(`Erreur lors du chargement de ${collectionName}:`, error);
            }
          }

          // Filtrer par catégorie
          allItems = allItems.filter(item => item.cathegorie === cathegorie);
        }

        console.log(`${allItems.length} éléments trouvés pour la catégorie ${cathegorie}`);
        setData(allItems);
        setLoader(false);

      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        setLoader(false);
      }
    };

    loadData();
  }, [currentUserdata?.email, cathegorie]);

  if (loader) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>{t('loading')}</Text>
      </View>
    );
  }

  if (!currentUserdata?.email) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{t('login_required_msg')}</Text>
      </View>
    );
  }

  if (data.length === 0) {
    const itemType = cathegorie?.toLowerCase().includes('memoire') ? t('tab_theses_label') : t('tab_books_label');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, textAlign: 'center', color: '#666' }}>
          {t('no_items_found_category', { itemType })}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView>
      <View style={{
        height: 50,
        alignSelf: 'center',
        backgroundColor: '#DCDCDC',
        width: WIDTH
      }}>
        <Text style={{
          textAlign: 'center',
          fontWeight: '600',
          fontFamily: 'San Francisco',
          marginTop: 10,
          fontSize: 20
        }}>
          {t(cathegorie) || t('uncategorized')}
        </Text>
      </View>
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {data.map((item, index) => (
          <BigRect
            key={`${item.id || index}-${item.type}`}
            type={item.type}
            datUser={currentUserdata}
            cathegorie={item.cathegorie || item.département || item.departement}
            props={navigation}
            name={item.name || item.titre || item.theme}
            desc={item.desc || item.description || item.abstract}
            etagere={item.etagere}
            exemplaire={item.exemplaire || 1}
            image={item.image}
            salle={item.salle}
            commentaire={item.commentaire || []}
            nomBD={item.id}
            // Champs spécifiques BiblioThesis
            annee={item.annee}
            superviseur={item.superviseur}
            keywords={item.keywords}
            pdfUrl={item.pdfUrl}
            matricule={item.matricule}
            theme={item.theme}
            createdAt={item.createdAt}
            département={item.département}
          />
        ))}
      </View>
    </ScrollView>
  );
};

export default Cathegorie;