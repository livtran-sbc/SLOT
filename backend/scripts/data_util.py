from ref.box_mapping import box_mapping

class dataUtil:

    def __init__(self):
        pass

    # function to get location assignment slots for freezer location assignment utility
    # mc_array codes = [{micronic_code, extraction_number}]
    def create_next_location_mappings(self, current_slot, mc_array):

        num_slots_valid = True
        print(mc_array)
        num_slots_needed = len(mc_array)
        print(num_slots_needed)
        #current_index = box_mapping.index(current_slot)
        #print(current_index)
        #next_index = current_index + 1
        #last_index = next_index + num_slots_needed

        # the next index and last index should not exceed 96 - max number of slots in a box is 96
        if next_index > 96 or last_index > 96:
            num_slots_valid = False
            next_slots = [{'remaining slots': 96 - next_index}]
        else:
            next_slots = [{'extraction number': mc_array[idx]['extraction number'],
                           'micronic code': mc_array[idx]['micronic code'],
                           'location': box_mapping[slot],
                           }
                          for idx, slot in enumerate(list(range(next_index, last_index)))]

        return next_slots, num_slots_valid

    # add box name to location
    def alter_location(self, box_name, mc_array):

        for obj in mc_array:
            obj['location'] = box_name + '/' + obj['location']

        return mc_array

    # create diff df for verify tube location and checking NGS tray
    def create_diff_df(self, df1, df2, df2_col, join_on):

        # perform outer join
        diff_df = df1.merge(df2, how='outer', on=join_on)

        #diff_df['match'] = (diff_df['database entry'] == diff_df['micronic code']).astype(str).str.upper()
        diff_df['match'] = (diff_df['database entry'] == diff_df[df2_col]).astype(str).str.upper()

        diff_df = diff_df.rename(columns={'micronic code':'micronic file entry'})
        diff_df = diff_df.fillna("NA")

        return diff_df

